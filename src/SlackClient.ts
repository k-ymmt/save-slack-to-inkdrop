import { WebClient } from "@slack/web-api";
import { URL } from "url";

export interface SlackUser {
  id: string;
  name?: string;
  imageUrl?: string;
}

export interface SlackChannel {
  id: string;
  name: string;
}

export interface SlackMessage {
  text: string;
  ts: number;
  user?: SlackUser;
  channel?: SlackChannel;
  url?: string;
}

export interface GetSlackMessageProps {
  channelId: string;
  ts: number;
}

export class SlackClient {
  #webClient: WebClient;

  constructor(token: string) {
    this.#webClient = new WebClient(token);
  }

  static parseSlackUrl(urlString: string): GetSlackMessageProps | undefined {
    const url = new URL(urlString);
    const [, archives, channelId, tsString] = url.pathname.split("/");

    if (
      url.protocol !== "https:" ||
      !url.host.match(/.+\.slack\.com/g) ||
      archives !== "archives" ||
      !channelId ||
      tsString.charAt(0) !== "p"
    ) {
      return undefined;
    }

    const ts = Number(tsString.slice(1)) / 1000000;
    if (isNaN(ts)) {
      return undefined;
    }
    return {
      channelId,
      ts,
    };
  }

  async getMessage(options: { channelId: string; ts: number }): Promise<SlackMessage | undefined> {
    const getUser = async (userId?: string): Promise<SlackUser | undefined> => {
      if (!userId) {
        return undefined;
      }

      return await this.getUser(userId);
    };

    const response = await this.#webClient.conversations.replies({
      channel: options.channelId,
      ts: options.ts.toString(),
    });
    const messages = response.messages;
    if (!messages || messages.length <= 0) {
      return undefined;
    }

    const message = messages[0];

    if (!message.text || !message.ts) {
      return undefined;
    }

    const [user, channel] = await Promise.all([getUser(message.user), this.getChannel(options.channelId)]);

    const ts = message.thread_ts ?? message.ts;
    if (!ts) {
      return undefined;
    }
    const url = await this.getPermalink(options.channelId, ts);

    return {
      text: message.text,
      ts: Number(ts),
      user,
      channel,
      url,
    };
  }

  async getUser(userId: string): Promise<SlackUser | undefined> {
    function name(string: string | undefined): string | undefined {
      if (!string || string.length === 0) {
        return undefined;
      }
      return string;
    }
    const response = await this.#webClient.users.info({ user: userId });
    const user = response.user;

    if (!user || !user.id) {
      return undefined;
    }

    return {
      id: user.id,
      name: name(user.profile?.display_name_normalized) ?? name(user.profile?.real_name_normalized),
      imageUrl: user.profile?.image_24,
    };
  }

  async getChannel(channelId: string): Promise<SlackChannel | undefined> {
    const response = await this.#webClient.conversations.info({ channel: channelId });
    const channel = response.channel;

    if (!channel || !channel.id || !channel.name) {
      return undefined;
    }

    return {
      id: channel.id,
      name: channel.name,
    };
  }

  async getPermalink(channelId: string, ts: string): Promise<string | undefined> {
    const permalink = await this.#webClient.chat.getPermalink({ channel: channelId, message_ts: ts });
    return permalink.permalink;
  }
}

