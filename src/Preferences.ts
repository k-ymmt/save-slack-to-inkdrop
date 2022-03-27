import { getPreferenceValues } from "@raycast/api";
import { InkdropOptions } from "./InkdropClient";

interface Preferences {
  slackToken: string;
  inkdropUserName: string;
  inkdropPassword: string;
  inkdropAddress: string;
  inkdropPort: string;
}

export class PreferencesStore {
  #preferences: Preferences;

  constructor() {
    this.#preferences = getPreferenceValues();
  }

  get slackToken(): string {
    return this.#preferences.slackToken;
  }

  get inkdropOptions(): InkdropOptions {
    return {
      user: {
        name: this.#preferences.inkdropUserName,
        password: this.#preferences.inkdropPassword,
      },
      address: this.#preferences.inkdropAddress,
      port: Number(this.#preferences.inkdropPort),
    };
  }
}
