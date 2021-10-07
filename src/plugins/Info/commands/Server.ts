import {
	BaseMessage,
	BasePlugin,
	BaseCommand,
	EmbedHelper,
	Logger,
	Discord,
} from "@framedjs/core";
import { oneLine, oneLineCommaLists } from "common-tags";

export default class extends BaseCommand {
	constructor(plugin: BasePlugin) {
		super(plugin, {
			id: "server",
			about: "View server stats.",
		});
	}

	// https://gist.github.com/foobball/f29ba5ddc0fd872d4311bed8fd306f39
	snowflakeToDate(snowflake: string): Date {
		const dateBits = Number(BigInt.asUintN(64, BigInt(snowflake)) >> 22n);
		return new Date(dateBits + 1420070400000);
	}

	async run(msg: BaseMessage): Promise<boolean> {
		if (msg.args) {
			if (msg.discord) {
				if (msg.discord.guild) {
					if (!msg.discord.guild.available) {
						Logger.warn(`guild not availiable`);
					}

					const guild = await msg.discord.guild.fetch();
					const iconUrl = guild.iconURL({
						dynamic: true,
					});

					let categoriesNumber = 0,
						textNumber = 0,
						voiceNumber = 0;

					guild.channels.cache.forEach(channel => {
						switch (channel.type) {
							case "GUILD_CATEGORY":
								categoriesNumber++;
								break;
							case "GUILD_NEWS":
							case "GUILD_TEXT":
								textNumber++;
								break;
							case "GUILD_VOICE":
								voiceNumber++;
								break;
						}
					});

					let owner = "Error";
					try {
						owner = (
							await msg.discord.guild.members.fetch(guild.ownerId)
						).toString();
					} catch (error) {
						Logger.error((error as Error).stack);
					}

					let unix = this.snowflakeToDate(
						msg.discord.guild.id
					).getTime();
					unix = (unix / 1000) | 0;
					const embed = EmbedHelper.getTemplate(
						msg.discord,
						await EmbedHelper.getCheckOutFooter(msg, this.id)
					)
						.setTitle("Server Stats")
						.addField("Owner", owner, true)
						.addField("Members", `${guild.memberCount}`, true)
						.addField(
							"Channels",
							oneLine`${categoriesNumber} categories,\n${textNumber} text, ${voiceNumber} voice`,
							true
						)
						.addField(
							"Role Count",
							`${guild.roles.cache.size}`,
							true
						)
						.addField("Created", `<t:${unix}>, `, true);
					// .addField(
					// 	"Roles",
					// 	oneLineCommaLists`${Array.from(
					// 		guild.roles.cache.values()
					// 	)}`
					// );
					Logger.debug(
						oneLineCommaLists`${Array.from(
							guild.roles.cache.values()
						)}`
					);

					if (iconUrl) {
						embed.setThumbnail(iconUrl);
					}

					await msg.discord.channel.send({ embeds: [embed] });

					return true;
				} else {
					Logger.error("guild is null");
					return false;
				}
			}
		}

		return false;
	}
}
