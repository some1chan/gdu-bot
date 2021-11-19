// import Command, { CommandClass } from "../../src/structures/Command";
import { BasePlugin, Client } from "@framedjs/core";
import path from "path";

export default class extends BasePlugin {
	constructor(client: Client) {
		super(client, {
			id: "default.bot.fun",
			name: "Fun",
			description: "Fun commands.",
			version: "0.1.0",
			paths: {
				commands: path.join(__dirname, "commands"),
				// events: path.join(__dirname, "events"),
			},
			groupEmote: "😛",
			groupName: "Fun",
		});
	}
}

//#region Exported Variables
export const emotes = ["👍", "👎", "🤷"];
export const optionEmotes = [
	"🇦",
	"🇧",
	"🇨",
	"🇩",
	"🇪",

	"🇫",
	"🇬",
	"🇭",
	"🇮",
	"🇯",

	"🇰",
	"🇱",
	"🇲",
	"🇳",
	"🇴",

	"🇵",
	"🇶",
	"🇷",
	"🇸",
	"🇹",
];
export const discordMaxReactionCount = 20;
export const oneOptionMsg = "You can choose only one option.";
export const onceOptionMsg = "You can choose only once.";
export const pollLimit =
	Math.min(Number(process.env.POLL_LIMIT), discordMaxReactionCount) ?? 10;

//#endregion
