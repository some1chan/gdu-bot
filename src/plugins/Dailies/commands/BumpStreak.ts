import { BaseCommand, BasePlugin, BaseMessage } from "@framedjs/core";
import { oneLine, stripIndent } from "common-tags";

export default class extends BaseCommand {
	constructor(plugin: BasePlugin) {
		super(plugin, {
			id: "bumpstreak",
			defaultPrefix: "!",
			about: "Bumps the user's streak up.",
			description: stripIndent`
			Bumps the user's streak up by an amount.

			${oneLine`
			The user parameter can be a mention or user ID.
			The last parameter sets the last post time for the user, and can be a number, a string, or empty.
			If it is a number, it is set it to x days ago.
			If it is any other string, it is set it to today.
			Else, it'll set it to yesterday.`}
			`,
			usage: `<user> [# of days | text]`,
			examples: stripIndent`
			\`{{prefix}}{{id}} @Gman1cus 4\` 
			\`{{prefix}}{{id}} 474802647602561056 6\`
			\`{{prefix}}{{id}} @Gman1cus meaningless text\`
			\`{{prefix}}{{id}} @Gman1cus\`  
			`,
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
