import {
  Action,
  ActionPanel,
  closeMainWindow,
  Color,
  Detail,
  Form,
  Icon,
  LocalStorage,
  popToRoot,
  showHUD,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { SlackChannel, SlackClient, SlackMessage } from "./SlackClient";
import { PreferencesStore } from "./Preferences";
import { format, toDate } from "date-fns";
import { InkdropBook, InkdropClient, InkdropColor, InkdropTag } from "./InkdropClient";
import { EmojiConvertor } from "emoji-js";
import Style = Toast.Style;

interface CommandForm {
  slackUrl?: string;
  book: string;
  tags: string[];
}

const store = new PreferencesStore();
const slackClient = new SlackClient(store.slackToken);
const inkdropClient = new InkdropClient(store.inkdropOptions);
const emoji = (() => {
  const emoji = new EmojiConvertor();
  emoji.replace_mode = "unified";
  return emoji;
})();

export default function Command() {
  function handleSubmit(values: CommandForm) {
    (async () => {
      if (!values.slackUrl) {
        await showToast(Style.Failure, "Slack URL is required not empty.");
        return;
      }
      const props = SlackClient.parseSlackUrl(values.slackUrl);
      if (!props) {
        await showToast(Style.Failure, "Not Slack Message url.");
        return;
      }
      const bookId = values.book;
      const book = books?.find((book) => book.id === bookId);
      if (!book) {
        await showToast(Style.Failure, "Required Book Id.");
        return;
      }
      await LocalStorage.setItem("book", book.id);

      push(<SlackPreview channelId={props.channelId} ts={props.ts} book={book} />);
    })();
  }

  const [isLoading, setIsLoading] = useState(true);
  const [books, setBooks] = useState<InkdropBook[] | undefined>(undefined);
  const [defaultBookId, setDefaultBookId] = useState<string | undefined>(undefined);
  const [tags, setTags] = useState<InkdropTag[] | undefined>(undefined);
  useEffect(() => {
    (async () => {
      const [books, tags] = await Promise.all([inkdropClient.getBooks(), inkdropClient.getTags()]);
      const defaultBookId = await LocalStorage.getItem<string>("book");
      if (books?.find((book) => book.id === defaultBookId)) {
        setDefaultBookId(defaultBookId);
      }
      setBooks(books);
      setTags(tags);
      setIsLoading(false);
    })();
  }, []);
  const { push } = useNavigation();

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm key="Submit" title="Preview Slack message" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="slackUrl" title="Slack URL" />
      <Form.Dropdown id="book" title="Inkdrop Book" defaultValue={defaultBookId}>
        {books?.map((book) => (
          <Form.DropdownItem key={book.id} title={book.name} value={book.id} />
        ))}
      </Form.Dropdown>
      <Form.TagPicker id="tags" title="Inkdrop Tags">
        {tags?.map((tag) => (
          <Form.TagPicker.Item
            title={tag.name}
            value={tag.id}
            icon={{ source: Icon.Dot, tintColor: toReaycastColor(tag.color) }}
          />
        ))}
      </Form.TagPicker>
    </Form>
  );
}

interface SlackPreviewProps {
  channelId: string;
  ts: number;
  book: InkdropBook;
}

function SlackPreview(props: SlackPreviewProps): JSX.Element {
  const [isLoading, setLoading] = useState(true);
  const [message, setMessage] = useState<SlackMessage | undefined>(undefined);
  const { pop } = useNavigation();
  useEffect(() => {
    (async () => {
      const message = await slackClient.getMessage(props);

      if (!message) {
        await showHUD("Slack Message Request is Failed");
        pop();
        return;
      }
      setMessage(message);
      setLoading(false);
    })();
  }, []);
  return (
    <Detail
      isLoading={isLoading}
      markdown={slackMessageText(message)}
      navigationTitle="Slack Preview"
      actions={
        <ActionPanel>
          <Action
            id="save_inkdrop"
            title="Save to Inkdrop"
            icon={Icon.Download}
            onAction={async () => {
              if (!message) {
                await showHUD("Require Message.");
                return;
              }
              await saveToInkdrop({ message, book: props.book });
            }}
          />
        </ActionPanel>
      }
    />
  );
}

function slackMessageText(message: SlackMessage | undefined): string {
  function headline(): string {
    const user = message?.user;
    if (!user) {
      return "";
    }

    const name = user.name ?? "";
    const icon = user.imageUrl ? `<img alt="Profile Image" src="${user.imageUrl}" />` : "";
    return `${icon}${name}`;
  }

  function footer(): string {
    function channelName(channel?: SlackChannel): string {
      if (!channel) {
        return "";
      }
      return `Posted in #${channel.name} | `;
    }

    function postedDate(ts?: number): string {
      if (!ts) {
        return "";
      }

      const date = toDate(ts);
      return `${format(date, "yyyy LL dd")} | `;
    }

    function link(): string {
      if (!message?.url) {
        return "";
      }

      return `[View message](${message.url})`;
    }

    return `${channelName(message?.channel)}${postedDate(message?.ts)}${link()}`;
  }

  if (!message) {
    return "";
  }

  return emoji.replace_colons(`${headline()}  \n${message.text}  \n<small>${footer()}</small>`);
}

interface SaveToInkdropOptions {
  message: SlackMessage;
  book: InkdropBook;
}

async function saveToInkdrop(options: SaveToInkdropOptions) {
  await inkdropClient.createNote({
    body: slackMessageText(options.message),
    bookId: options.book.id,
    share: "private",
    status: "active",
    tags: [],
  });
  await showHUD("Save Success!");
  await popToRoot();
  await closeMainWindow({ clearRootSearch: true });
}

function toReaycastColor(color: InkdropColor): Color | string | undefined {
  switch (color) {
    case "red":
      return Color.Red;
    case "orange":
      return Color.Orange;
    case "yellow":
      return Color.Yellow;
    case "olive":
      return "#C2BD3D";
    case "green":
      return Color.Green;
    case "teal":
      return "#008080";
    case "blue":
      return Color.Blue;
    case "violet":
      return "#5a4498";
    case "purple":
      return Color.Purple;
    case "pink":
      return "#FF69B4";
    case "brown":
      return Color.Brown;
    case "grey":
      return "#808080";
    case "black":
      return "#282828";
    case "default":
      return undefined;
  }
}
