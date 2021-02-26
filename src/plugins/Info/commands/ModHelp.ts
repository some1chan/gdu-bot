import {
	BaseMessage,
	BasePlugin,
	BaseCommand,
	EmbedHelper,
	Logger,
	FriendlyError,
} from "@framedjs/core";
import { oneLine } from "common-tags";
import { HelpData } from "@framedjs/core";

const data: HelpData[][] = [
	[
		{
			group: "Dailies",
			commands: ["bumpstreak", "setmercies", "setstreak"],
		},
		{
			group: "GDU Utilities",
			commands: ["toggleevent"],
		},
		{
			group: "Reaction Roles",
			commands: ["reactionrole"],
		},
		{
			group: "Voice Queue",
			commands: ["queue"],
		},
	],
	[
		{
			group: "Manage",
			commands: ["command", "group"],
		},
		{
			group: "Markdown",
			commands: ["channel", "emoji", "user", "role", "raw"],
		},
		{
			group: "Utilities",
			commands: ["link", "multi", "nickname", "render", "setavatar"],
		},
	],
];

export default class extends BaseCommand {
	constructor(plugin: BasePlugin) {
		super(plugin, {
			id: "modhelp",
			aliases: ["modh", "mh"],
			about: "View help for mod commands.",
		});
	}

	async run(msg: BaseMessage): Promise<boolean> {
		return this.showHelpAll(msg);
	}

	private async showHelpAll(msg: BaseMessage): Promise<boolean> {
		if (!msg.args) {
			throw new FriendlyError();
		}

		const min = 1;
		const max = 2;
		const pageNum = Math.min(
			Math.max(min, Number(msg.args[0] ?? min)),
			max
		);

		const place = await msg.getPlace();
		const helpFields = await this.client.plugins.createHelpFields(
			data[pageNum - 1],
			place
		);

		if (msg.discord && helpFields) {
			let modRoleString = msg.discord.guild?.roles.cache
				.find(role => role.name == "Mods")
				?.toString();
			if (!modRoleString) {
				modRoleString = "<@&462342299171684364>";
			}

			let communitySupportRole = msg.discord.guild?.roles.cache
				.find(role => role.name == "Community Support")
				?.toString();
			if (!communitySupportRole) {
				communitySupportRole = "<@&758771336289583125>";
			}

			const embed = await this.client.formatting.formatEmbed(
				EmbedHelper.getTemplate(
					msg.discord,
					await EmbedHelper.getCheckOutFooter(msg, this.id)
				)
					.setTitle("Mod Command Help")
					.setDescription(
						oneLine`
						These are commands designed mostly for
						${modRoleString} and ${communitySupportRole} only.`
					)
					.addFields(helpFields),
				place
			);

			const existingFooterText = embed.footer?.text
				? embed.footer.text
				: "";
			const newFooterText = this.client.formatting.formatCommandNotation(
				`Page ${pageNum}/${max} - Use {{prefix}}{{id}} [page number] to access a new page.`,
				this,
				await msg.getPlace()
			);
			embed.setFooter(
				`${existingFooterText}\n${newFooterText}`,
				embed.footer?.iconURL
			);

			try {
				await msg.discord.channel.send(embed);
			} catch (error) {
				await msg.discord.channel.send(
					`${msg.discord.author}, the embed size for help is too large! Contact one of the bot masters`
				);
				Logger.error(error.stack);
			}
			return true;
		}
		return false;
	}
}
