import { BaseCommand, BaseMessage, BaseSubcommand } from "@framedjs/core";

export default class extends BaseSubcommand {
	constructor(command: BaseCommand) {
		super(command, {
			id: "all",
			about: "Show a list of all users' streaks.",
			hideUsageInHelp: true,
		});
	}

	async run(msg: BaseMessage): Promise<boolean> {
		if (msg.discord) {
			return true;
		}
		return false;
	}
}
