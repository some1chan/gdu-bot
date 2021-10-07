import { BaseCommand, BaseMessage, BasePlugin, Utils } from "@framedjs/core";

// randomResponses = [
// 	// Positive
// 	"It is certain.",
// 	"It is decidedly so.",
// 	"Without a doubt.",
// 	"Yes – definitely.",
// 	"You may rely on it.",
// 	"As I see it, yes.",
// 	"Most likely.",
// 	"Outlook good.",
// 	"Yes.",
// 	"Signs point to yes.",

// 	// Neutral
// 	"Reply hazy, try again.",
// 	"Ask again later.",
// 	"Better not tell you now.",
// 	"Cannot predict now.",
// 	"Concentrate and ask again.",

// 	// Negative
// 	"Don’t count on it.",
// 	"My reply is no.",
// 	"My sources say no.",
// 	"Outlook not so good.",
// 	"Very doubtful.",
// ];

export default class extends BaseCommand {
	randomResponses = [
		// Positive
		"sounds likely!",
		"yeah!",
		"without a doubt!~",
		"yeah, definitely!",
		"i think so!",
		"from how I see it, yeah!",
		"i think it's likely!",
		"i think that's possible!",
		"YES",
		"i'm pretty sure, yeah!",

		// Neutral
		"give me a moment to think about that one...",
		"i'll get back to you on that!",
		"maybe I shouldn't tell you right now...",
		"i'm not sure right now, to be honest!",
		"i don't know...",

		// Negative
		"i wouldn't count on it, personally.",
		"i'm not so sure about that...",
		"hmm, maybe not.",
		"i would say *maaaaybe* not the best chances.",
		"i don't think so...",
	];

	constructor(plugin: BasePlugin) {
		super(plugin, {
			id: "8ball",
			about: "Ask a question to the bot.",
			usage: "[question]",
		});
	}

	async run(msg: BaseMessage): Promise<boolean> {
		if (!msg.args || !msg.args[0]) {
			await msg.sendHelpForCommand();
			return false;
		}

		const randomIndex = Utils.randomNumber(
			0,
			this.randomResponses.length - 1
		);
		const randomResponse = this.randomResponses[randomIndex];
		await msg.send(`${randomResponse}`);
		return true;
	}
}
