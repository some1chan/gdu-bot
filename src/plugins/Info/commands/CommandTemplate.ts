import { BaseCommand, BaseMessage, BasePlugin } from "@framedjs/core";

export default class extends BaseCommand {
	constructor(plugin: BasePlugin) {
		super(plugin, {
			id: "commandtemplate",
			about: "Not a real command. Instead, you should copy me!",
			usage: "<required param> [optional param]",
		});
	}

	async run(msg: BaseMessage): Promise<boolean> {
		// Checks for permission manually
		if (!this.hasPermission(msg, this.userPermissions)) {
			await this.sendPermissionErrorMessage(msg);
			return false;
		}

		if (msg.args) {
			await msg.send("test");
			return true;
		}

		return false;
	}
}
