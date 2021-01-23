import { BaseCommand, BasePlugin, Message } from "@framedjs/core";
import { oneLine, stripIndent } from "common-tags";

export default class extends BaseCommand {
	constructor(plugin: BasePlugin) {
		super(plugin, {
			id: "bumpstreak",
			about: "Bumps the user's streak up by an amount.",
			description: oneLine`
			Bumps the user's streak up by an amount.
			The user parameter can be a mention or user ID.
			The number is the streak amount.
			The today parameters sets the last post time should to today, rather than yesterday.
			`,
			usage: `<user> <number> [today]`,
			examples: stripIndent`
			\`{{prefix}}{{id}} @Gman1cus 4\` 
			\`{{prefix}}{{id}} 474802647602561056 6\`
			`,
		});
	}

	async run(msg: Message): Promise<boolean> {
		if (msg.discord) {
			// This has been intentionally left blank, since a
			// separate bot written in Python handles this, instead.
			return true;
		}
		return false;
	}
}
