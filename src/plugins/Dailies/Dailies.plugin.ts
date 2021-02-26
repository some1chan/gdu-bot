import { BasePlugin, Client, FriendlyError, Logger } from "@framedjs/core";
import path from "path";

export default class extends BasePlugin {
	constructor(client: Client) {
		super(client, {
			id: "com.geekoverdrivestudio.dailies",
			defaultPrefix: "!",
			name: "Dailies",
			authors: [
				{
					discordId: "359521958519504926",
					discordTag: "Gmanicus#5137",
					twitchUsername: "gman1cus",
					twitterUsername: "Geek_Overdrive",
				},
			],
			description: "Challenge yourself to do something every day.",
			version: "0.1.0",
			paths: {
				commands: path.join(__dirname, "commands"),
				routes: path.join(__dirname, "routes"),
			},
			groupEmote: "🕒",
			groupName: "Dailies",
		});
	}

	async install(): Promise<void> {
		await this.client.provider.plugins.set(this.id, "version", "1.63.4");
	}
}
