/* eslint-disable no-mixed-spaces-and-tabs */
import { oneLine, stripIndent } from "common-tags";
import {
	PluginManager,
	BaseCommand,
	BasePlugin,
	Message,
} from "@framedjs/core";
import path from "path";

export default class CustomGroup extends BaseCommand {
	constructor(plugin: BasePlugin) {
		super(plugin, {
			id: "group",
			aliases: ["groups", "grp", "category", "customcategory"],
			about: "Manages groups.",
			description: oneLine`
			These command allows you to add, edit, delete, and list custom groups.
			These groups are shown with commands in them, which can be set with this command.`,
			examples: stripIndent`
			\`{{prefix}}{{id}} add "🍎 Food Stuff"\`
			\`{{prefix}}{{id}} set newcommand "Food Stuff"\`
			\`{{prefix}}{{id}} edit "Food Stuff" "🍏 Food"\`
			\`{{prefix}}{{id}} delete Food\`
			\`{{prefix}}{{id}} list\``,
			permissions: {
				discord: {
					permissions: ["MANAGE_MESSAGES"],
					// Mods, Community Manager
					roles: ["462342299171684364", "758771336289583125"],
				},
			},
			paths: {
				subcommands: path.join(__dirname, "subcommands"),
			},
			hideUsageInHelp: true,
		});
	}

	async run(msg: Message): Promise<boolean> {
		await PluginManager.sendHelpForCommand(msg, await msg.getPlace());
		return false;
	}
}
