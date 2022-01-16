import { BaseRouter, Client, EmbedHelper, Logger } from "@framedjs/core";
import util from "util";

export default class extends BaseRouter {
	constructor(client: Client) {
		super(client);

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
					client.formatting,
					place,
					client.footer,
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
	}
}
