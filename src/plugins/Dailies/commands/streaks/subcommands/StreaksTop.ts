import { BaseCommand, BaseSubcommand, Message } from "@framedjs/core";

export default class extends BaseSubcommand {
	constructor(command: BaseCommand) {
		super(command, {
			id: "top",
			about: "Show the top three people with the highest streak.",
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
