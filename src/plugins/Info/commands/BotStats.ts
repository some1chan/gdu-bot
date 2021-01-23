import {
	BaseCommand,
	BasePlugin,
	DatabaseManager,
	EmbedHelper,
	Message,
	Plugin,
	Logger,
	Utils,
	version as backEndVersion,
} from "@framedjs/core";
import { stripIndent } from "common-tags";
import os from "os";

export default class extends BaseCommand {
	constructor(plugin: BasePlugin) {
		super(plugin, {
			id: "botstats",
			aliases: ["bot", "uptime", "botinfo", "ver", "version", "versions"],
			about: "Get bot stats, including versions and uptime.",
		});
	}

	async run(msg: Message): Promise<boolean> {
		// Attempts to find dailies version
		let dailiesVersion = "???";
		try {
			const connection = this.client.database.connection;
			if (!connection) {
				throw new Error(DatabaseManager.errorNoConnection);
			}
			const pluginId = "com.geekoverdrivestudio.dailies";
			const pluginRepo = connection.getRepository(Plugin);
			const plugin = await pluginRepo.findOne({
				where: {
					id: pluginId,
				},
			});
			if (!plugin) {
				throw new Error(
					Utils.util.format(DatabaseManager.errorNotFound, "plugin", pluginId)
				);
			}

			dailiesVersion = plugin.data.version as string;
		} catch (error) {
			Logger.error(error.stack);
		}

		// For debugging
		// eslint-disable-next-line prefer-const
		let uptime = process.uptime();
		// uptime = 216120;

		// The rest of the data
		const osArch = `${os.platform()}/${os.arch()}`;
		const nodeEnvironment = process.env.NODE_ENV ? `${process.env.NODE_ENV}` : "";
		const uptimeText = this.secondsToDhms(uptime);
		const ramUsage = process.memoryUsage().rss / 1024 / 1024;
		const ramUsageText = `${Number(ramUsage).toFixed(1)}`;
		const backEnd = backEndVersion ? `v${backEndVersion}` : "???";
		const botVersion = `${msg.client.appVersion ? `v${msg.client.appVersion}` : "???"}`;

		if (msg.discord) {
			const codeblock = "```";
			const embed = EmbedHelper.getTemplate(
				msg.discord,
				this.client.helpCommands,
				this.id
			).setTitle("Bot Stats").setDescription(stripIndent`
				${codeblock}yml
				Server:
				- OS/Arch:      ${osArch}
				- Environment:  ${nodeEnvironment}
				${codeblock}${codeblock}yml
				Framed.js Bot:
				- Uptime:       ${uptimeText}
				- RAM Usage:    ${ramUsageText} MiB
				- Back-End:     ${backEnd}
				- Bot Version:  ${botVersion}
				${codeblock}${codeblock}yml
				Dailies Bot:
				- Bot Version:  v${dailiesVersion}
				${codeblock}
				`);
			await msg.discord.channel.send(embed);
			return true;
		} else {
			if (msg.command != "uptime") {
				await msg.send(`Bot ${botVersion} running Framed ${backEnd}`);
				return true;
			}
		}
		return false;
	}

	private secondsToDhms(seconds: number): string {
		seconds = Number(seconds);
		const d = Math.floor(seconds / (3600 * 24));
		const h = Math.floor((seconds % (3600 * 24)) / 3600);
		const m = Math.floor((seconds % 3600) / 60);
		const s = Math.floor(seconds % 60);

		const dDisplay = d > 0 ? `${d}d ` : "";
		const hDisplay = h > 0 ? `${h}hr ` : "";
		const mDisplay = m > 0 ? `${m}m ` : "";
		const sDisplay = s > 0 ? `${s}s ` : "";

		return `${dDisplay}${hDisplay}${mDisplay}${sDisplay}`;
		// return dDisplay + hDisplay + mDisplay + sDisplay;
	}
}
