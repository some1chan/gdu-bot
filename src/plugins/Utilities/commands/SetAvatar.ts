import {
	Message,
	BasePlugin,
	BaseCommand,
	Logger,
	EmbedHelper,
	NotFoundError,
	PluginManager,
} from "framed.js";

export default class extends BaseCommand {
	constructor(plugin: BasePlugin) {
		super(plugin, {
			id: "setavatar",
			about: "Sets the bot's avatar.",
			usage: "<image URL>",
			permissions: {
				discord: {
					// This command doesn't do any checks, use this command for only trusted people
					permissions: ["ADMINISTRATOR"],
				},
			},
		});
	}

	async run(msg: Message): Promise<boolean> {
		// Checks for permission
		if (!this.hasPermission(msg, this.permissions)) {
			this.sendPermissionErrorMessage(msg);
			return false;
		}

		const argsContent = msg.getArgsContent();
		if (argsContent.length == 0) {
			await PluginManager.sendHelpForCommand(msg);
			return false;
		}

		try {
			if (msg.discord) {
				await msg.discord.client.user?.setAvatar(msg.getArgsContent());

				const embed = EmbedHelper.getTemplate(
					msg.discord,
					this.client.helpCommands,
					this.id
				)
					.setTitle("Changed Avatar")
					.setDescription(`The bot avatar has been changed to this image!`)
					.setThumbnail(msg.getArgsContent());
				await msg.discord.channel.send(embed);
			}
		} catch (error) {
			Logger.error(error);
			throw new Error(error);
		}

		return false;
	}
}
