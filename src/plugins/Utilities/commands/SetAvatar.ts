import {
	Message,
	BasePlugin,
	BaseCommand,
	Logger,
	EmbedHelper,
	PluginManager,
} from "@framedjs/core";

export default class extends BaseCommand {
	constructor(plugin: BasePlugin) {
		super(plugin, {
			id: "setavatar",
			about: "Sets the bot's avatar.",
			usage: "<image URL>",
		});
	}

	async run(msg: Message): Promise<boolean> {
		// Checks for permission
		if (!this.hasPermission(msg, this.permissions)) {
			this.sendPermissionErrorMessage(msg);
			return false;
		}

		// Guild checks
		if (
			msg.discord?.guild?.id != "274284473447612416" &&
			msg.discord?.guild?.id != "768555876717953085"
		)
			return false;

		// Jank owner check, or role check
		if (
			msg.discord?.author.id != "200340393596944384" ||
			msg.discord.member?.roles.cache.some(
				value =>
					// GDU Mod
					value.id == "462342299171684364" ||
					// Community Support
					value.id == "758771336289583125"
			)
		)
			return false;

		const argsContent = msg.getArgsContent();
		const attachment = msg.discord.msg?.attachments?.first();

		let url = "";
		if (attachment?.width) {
			url = attachment.url;
		} else if (argsContent.length != 0) {
			url = argsContent;
		} else {
			await PluginManager.sendHelpForCommand(msg, await msg.getPlace());
			return false;
		}

		try {
			if (msg.discord) {
				await msg.discord.client.user?.setAvatar(url);

				const embed = EmbedHelper.getTemplate(
					msg.discord,
					await EmbedHelper.getCheckOutFooter(msg, this.id)
				)
					.setTitle("Changed Avatar")
					.setDescription(
						`The bot avatar has been changed to this image!`
					)
					.setThumbnail(url);
				await msg.discord.channel.send(embed);
			}
		} catch (error) {
			Logger.error(error);
			throw new Error(error);
		}

		return false;
	}
}
