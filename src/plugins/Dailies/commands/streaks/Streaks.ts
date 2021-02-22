import { BaseCommand, BaseMessage, BasePlugin } from "@framedjs/core";
import { oneLine, stripIndent } from "common-tags";
import path from "path";

export default class extends BaseCommand {
	constructor(plugin: BasePlugin) {
		super(plugin, {
			id: "streaks",
			aliases: ["streak", "s"],
			defaultPrefix: "!",
			about: "View your streak, or another user's streak.",
			description: oneLine`
			View your streak, or another user's streak.
			To view the top three users' streaks, use \`$(command ${plugin.id} {{id}} top)\`.
			To view all the users' streaks, use \`$(command ${plugin.id} {{id}} all)\`.`,
			usage: `[@user|id]`,
			examples: stripIndent`
			\`{{prefix}}{{id}}\`
			\`{{prefix}}{{id}} @Gman1cus\`
			\`{{prefix}}{{id}} 474802647602561056\``,
			paths: {
				subcommands: path.join(__dirname, "subcommands"),
			},
			inline: true,
		});
	}

	async run(msg: BaseMessage): Promise<boolean> {
		if (msg.discord) {
			// This has been intentionally left blank, since a
			// separate bot writtern in Python handles this, instead.
			return true;
		}
		return false;
	}
}
