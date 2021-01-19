import { BaseCommand, BaseSubcommand, Message } from "framed.js";

export default class extends BaseSubcommand {
	constructor(command: BaseCommand) {
		super(command, {
			id: "all",
			about: "Show a list of all users' streaks.",
			hideUsageInHelp: true,
		});
	}

	async run(msg: Message): Promise<boolean> {
		if (msg.discord) {
			return true;
		}
		return false;
	}
}
