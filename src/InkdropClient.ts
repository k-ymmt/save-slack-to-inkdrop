import { AxiosInstance, default as axios } from "axios";

export interface InkdropOptions {
  user: {
    name: string;
    password: string;
  };

  port: number;
  address: string;
}

interface InkdropCreateNoteOptions {
  bookId: string;
  status: "active" | "onHold" | "completed" | "dropped" | "none";
  share: "private" | "public";
  body: string;
  tags?: string[];
}

export interface InkdropBook {
  id: string;
  name: string;
}

export type InkdropColor =
  | "default"
  | "red"
  | "orange"
  | "yellow"
  | "olive"
  | "green"
  | "teal"
  | "blue"
  | "violet"
  | "purple"
  | "pink"
  | "brown"
  | "grey"
  | "black";

export interface InkdropTag {
  color: InkdropColor;
  name: string;
  id: string;
}

export class InkdropClient {
  #instance: AxiosInstance;

  constructor(options: InkdropOptions) {
    this.#instance = axios.create({
      baseURL: `http://${options.address}:${options.port}`,
      auth: {
        username: options.user.name,
        password: options.user.password,
      },
    });
  }

  async createNote(options: InkdropCreateNoteOptions): Promise<void> {
    await this.#instance.post("/notes", options);
  }

  async getBooks(): Promise<InkdropBook[] | undefined> {
    const { data } = await this.#instance.get<any[]>("/books");

    return data
      .map((book) => {
        const id = book["_id"];
        const name = book["name"];

        if (id && name) {
          return {
            id,
            name,
          };
        } else {
          return undefined;
        }
      })
      .filter((book): book is InkdropBook => book !== undefined);
  }

  async getTags(): Promise<InkdropTag[] | undefined> {
    const { data } = await this.#instance.get<any[]>("tags");

    return data
      .map((tag) => {
        const id = tag["_id"];
        const color = tag["color"];
        const name = tag["name"];

        if (id && color && name) {
          return {
            id,
            color,
            name,
          };
        } else {
          return undefined;
        }
      })
      .filter((tag): tag is InkdropTag => tag !== undefined);
  }
}
