import {
	BasePlugin,
	Client,
	EmbedHelper,
	FriendlyError,
	Logger,
	Utils,
} from "@framedjs/core";
import { CustomClient } from "../../structures/CustomClient";
import { DatabaseManager } from "../../managers/DatabaseManager";
import Koa from "koa";
import Router from "koa-router";
import path from "path";
import util from "util";
import { oneLine } from "common-tags";

export default class extends BasePlugin {
	readonly app = new Koa();
	readonly router = new Router();

	constructor(client: Client) {
		super(client, {
			id: "com.geekoverdrivestudio.dailies",
			defaultPrefix: "!",
			name: "Dailies",
			authors: [
				{
					discordId: "359521958519504926",
					discordTag: "Gmanicus#5137",
					twitchUsername: "gman1cus",
					twitterUsername: "Geek_Overdrive",
				},
			],
			description: "Challenge yourself to do something every day.",
			version: "0.1.0",
			paths: {
				commands: path.join(__dirname, "commands"),
				// routes: path.join(__dirname, "routes"),
			},
			groupEmote: "🕒",
			groupName: "Dailies",
		});
	}

	async install(): Promise<void> {
		await this.client.provider.plugins.set(this.id, "version", "1.63.4");
	}

	async setupEvents(): Promise<void> {
		// No clue if this is a good idea
		// https://inviqa.com/blog/how-build-basic-api-typescript-koa-and-typeorm
		this.app.use(async (ctx: Koa.Context, next: () => Promise<unknown>) => {
			try {
				const start = Date.now();
				await next();
				const ms = Date.now() - start;
				Logger.http(`${ctx.method} ${ctx.url} - ${ms}ms`);
			} catch (error) {
				ctx.status = 500;
				(error as any).status = ctx.status;
				ctx.body = { error };
				ctx.app.emit("error", error, ctx);
			}
		});

		// Application error logging
		this.app.on("error", Logger.error);

		// Sets port and listens
		const port = Number(process.env.API_PORT) || 42069;
		this.app.listen(port);
		Logger.http(`API is listening on port ${port}`);

		this.router.post("/api/v0/dailies/version", async ctx => {
			const version = ctx.query.version;
			Logger.debug(`Dailies version: ${version}`);
			try {
				if (!version) {
					throw new Error("No version query found in URL.");
				}

				if (!(this.client instanceof CustomClient)) {
					Logger.error(
						"CustomClient is needed! This code needs a reference to DatabaseManager"
					);
					throw new FriendlyError(
						oneLine`The bot wasn't configured correctly!
							Contact one of the developers about this issue.`
					);
				}

				const pluginRepo = this.client.database.pluginRepo;
				const id = "com.geekoverdrivestudio.dailies";
				const plugin = await pluginRepo.findOne({
					where: { id: id },
				});

				if (!plugin) {
					throw new ReferenceError(
						util.format(
							DatabaseManager.errorNoConnection,
							"plugin",
							id
						)
					);
				}

				plugin.data.version = version;
				await pluginRepo.save([plugin]);

				ctx.status = 201;
			} catch (error) {
				ctx.body = (error as Error).message;
				ctx.status = 400;
			}
		});

		this.router.get("/api/v0/discord/embedtemplate", async ctx => {
			// const footerUrl = ctx.query.footerUrl || "";
			const commandUsed = (ctx.query.commandUsed as string) || "";

			const guild = this.client.discord?.client?.guilds.cache.get(
				process.env.MAIN_GUILD_ID ?? ""
			);
			const guildColor = guild?.me?.displayColor;

			// Message.discordGetPlace, except it doesn't create a new Place if not found
			// This is to workaround a bug in where the new Place is being created elsewhere
			// but events will also try to create a new place too,
			// thus creating duplicates and will error
			const platformId = guild?.id ?? "discord_default";
			let place = this.client.provider.places.get(platformId);
			if (!place) {
				place = {
					id: "default",
					platform: "discord",
				};
			}

			Logger.debug(`MAIN_GUILD_ID: ${process.env.MAIN_GUILD_ID}`);
			Logger.debug(`guild.id: ${guild?.id}`);
			Logger.debug(`place: ${util.inspect(place)}`);

			const embed = EmbedHelper.getTemplateRaw(
				EmbedHelper.getColorWithFallback(undefined, guildColor),
				await EmbedHelper.getCheckOutFooter(
					this.client.formatting,
					place,
					this.client.footer,
					commandUsed
				)
			);

			// Workaround to make dailies bot not freak out when the icon_url doesn't exist
			embed.setFooter({
				text: `${embed.footer?.text ?? ""}`,
				iconURL: embed.footer?.iconURL ?? "",
			});

			const json = JSON.stringify(embed);

			ctx.set("Content-Type", "application/json");
			ctx.body = json;
		});

		this.router.use(this.router.routes());
		this.router.use(this.router.allowedMethods());
		this.app.use(this.router.routes());
		this.app.use(this.router.allowedMethods());
	}
}
