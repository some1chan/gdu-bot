import { BaseCommand, BaseSubcommand, BaseMessage } from "@framedjs/core";

export default class extends BaseSubcommand {
	constructor(command: BaseCommand) {
		super(command, {
			id: "top",
			about: "Show the top three people with the highest streak.",
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
