import { BaseCommand, BaseMessage, BasePlugin, Logger } from "@framedjs/core";
import { oneLine } from "common-tags";

export default class extends BaseCommand {
	constructor(plugin: BasePlugin) {
		super(plugin, {
			id: "vacation",
			defaultPrefix: "!",
			about: "Toggle vacation mode.",
			description: oneLine`
			Toggles vacation mode, where your streak gets locked.
			This command prevents your streak from being lost,
			if you must be away for a decent amount of time.
			Note that your streak temporarily cannot be unlocked
			until after 24 hours.`,
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
