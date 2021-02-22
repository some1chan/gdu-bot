import { BasePlugin, Client, FriendlyError, Logger } from "@framedjs/core";
import { oneLine } from "common-tags";
import path from "path";
import { CustomClient } from "../../structures/CustomClient";

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
		if (!(this.client instanceof CustomClient)) {
			Logger.error(
				"CustomClient is needed! This code needs a reference to DatabaseManager"
			);
			throw new FriendlyError(
				oneLine`The bot wasn't configured correctly!
				Contact one of the developers about this issue.`
			);
		}

		const dbPlugin = await this.client.database.findPlugin(this.id);
		if (!dbPlugin) {
			throw new Error("Couldn't find plugin in database!");
		}
		const pluginRepo = this.client.database.pluginRepo;
		if (!pluginRepo) {
			throw new Error("Couldn't find plugin repo in database!");
		}

		dbPlugin.data.version = "1.52";
		await pluginRepo.save(dbPlugin);
	}
}
