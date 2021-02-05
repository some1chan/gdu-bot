import { BaseCommand, BasePlugin, Message } from "@framedjs/core";
import { oneLine } from "common-tags";

export default class extends BaseCommand {
	constructor(plugin: BasePlugin) {
		super(plugin, {
			id: "togglewarnings",
			defaultPrefix: "!",
			about: `Toggles streak warnings.`,
			description: oneLine`
			Toggles streak warnings, for when your streak is about to be lost.`,
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
