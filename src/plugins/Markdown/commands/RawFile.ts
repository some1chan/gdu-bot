/* eslint-disable no-mixed-spaces-and-tabs */
import { BaseCommand, BaseMessage, BasePlugin } from "@framedjs/core";
import { stripIndent } from "common-tags";
import Raw from "./Raw";

export default class extends BaseCommand {
	constructor(plugin: BasePlugin) {
		super(plugin, {
			id: "rawfile",
			prefixes: ["d."],
			about:
				"Escapes all markdown in a message, but stores the results into a file.",
			usage: "[id|link|content]",
			examples: stripIndent`
			\`{{prefix}}{{id}}\`
			\`{{prefix}}{{id}} This ~~is~~ a **test**!\``,
			userPermissions: {
				discord: {
					// Mods, Community Manager
					roles: ["462342299171684364", "758771336289583125"],
				},
			},
			inline: true,
			// hideUsageInHelp: true,
		});
	}

	async run(msg: BaseMessage): Promise<boolean> {
		if (!this.hasPermission(msg)) {
			await this.sendPermissionErrorMessage(msg);
			return false;
		}

		if (msg.discord?.guild && msg.args) {
			const parse = await Raw.getNewMessage(msg, true);
			return await Raw.showStrippedMessage(
				msg,
				this.id,
				parse?.newContent,
				"file"
			);
		}

		return false;
	}
}
