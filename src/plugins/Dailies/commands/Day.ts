import { BaseCommand, BaseMessage, BasePlugin } from "@framedjs/core";
import { oneLine, stripIndents } from "common-tags";

export default class extends BaseCommand {
	constructor(plugin: BasePlugin) {
		super(plugin, {
			id: "day",
			defaultPrefix: "!",
			about: `Look up what a user posted on a day.`,
			description: oneLine`
			Look up what a user posted on a day. By default, this is a random day,
			but can be specified by \`day number\`. Optionally, you can check a user ID.
			`,
			usage: `[number|"random"] [@user|id]`,
			examples: stripIndents`
			\`{{prefix}}{{id}}\`
			\`{{prefix}}{{id}} 3\`
			\`{{prefix}}{{id}} random 163770616581718017\`
			\`{{prefix}}{{id}} 152 805336240869343232\`
			`,
			inline: true,
		});
	}

	async run(msg: BaseMessage): Promise<boolean> {
		if (msg.discord) {
			// This has been intentionally left blank, since a
			// separate bot written in Python handles this, instead.
			return true;
		}
		return false;
	}
}
