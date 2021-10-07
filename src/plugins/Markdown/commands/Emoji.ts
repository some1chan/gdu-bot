import {
	BaseMessage,
	BasePlugin,
	BaseCommand,
	EmbedHelper,
	PluginManager,
	NotFoundError,
	Logger,
} from "@framedjs/core";
import { oneLine } from "common-tags";
import Emoji from "node-emoji";

export default class extends BaseCommand {
	constructor(plugin: BasePlugin) {
		super(plugin, {
			id: "emoji",
			about: "Gets an emoji for Discord markdown formatting.",
			description: oneLine`
			Gets an emoji for Discord markdown formatting.
			The emoji parameter can be an \`:emoji:\`, an actual emoji like 🍎, or ID.
			`,
			usage: "<emoji>",
		});
	}

	async run(msg: BaseMessage): Promise<boolean> {
		if (msg.args) {
			if (msg.discord) {
				const newContent = msg.getArgsContent().split(" ")[0];
				if (newContent.length == 0) {
					await msg.sendHelpForCommand();
					return false;
				}

				const discordEmoji = msg.discord.client.emojis.cache
					.find(
						emoji =>
							emoji.id == newContent ||
							emoji.name == newContent ||
							`<:${emoji.identifier}>` == newContent
					)
					?.toString();

				const normalEmoji = Emoji.emojify(newContent);

				if (!discordEmoji && !Emoji.hasEmoji(newContent)) {
					throw new NotFoundError({
						input: newContent,
						name: "Emoji",
					});
				}

				const finalEmoji = discordEmoji
					? discordEmoji
					: Emoji.emojify(normalEmoji);

				const embed = EmbedHelper.getTemplate(
					msg.discord,
					await EmbedHelper.getCheckOutFooter(msg, this.id)
				)
					.setTitle("Emoji Formatting")
					.setDescription(`\`${finalEmoji}\``)
					.addField("Output", finalEmoji);

				await msg.discord.channel.send({ embeds: [embed] }); // Uncomment me!
				return true;
			} else {
				Logger.warn("unsupported");
			}
		}

		return false;
	}
}
