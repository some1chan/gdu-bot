import { BaseCommand, BaseMessage, BasePlugin } from "@framedjs/core";
import { oneLine } from "common-tags";

export default class extends BaseCommand {
	constructor(plugin: BasePlugin) {
		super(plugin, {
			id: "alert",
			defaultPrefix: "!",
			about: `Toggles streak alerts.`,
			description: oneLine`
			Toggles streak alerts. You will receive the <@&761514004723662849> role,
			which gets pinged for each new streak day. To remove the role and pings,
			simply do this command again.`,
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
