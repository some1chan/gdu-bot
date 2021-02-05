import {
	BaseRouter,
	Client,
	EmbedHelper,
	Message,
	Place,
} from "@framedjs/core";

export default class extends BaseRouter {
	constructor(client: Client) {
		super(client);

		this.router.get("/api/v0/discord/embedtemplate", async ctx => {
			const footerUrl = ctx.query.footerUrl || "";
			const commandUsed = ctx.query.commandUsed || "";

			const guild = this.client.discord?.client?.guilds.cache.get(
				process.env.MAIN_GUILD_ID ? process.env.MAIN_GUILD_ID : ""
			);
			const guildColor = guild?.me?.displayColor;

			const place: Place = guild
				? Message.discordGetPlace(client, guild, true)
				: {
						id: "default",
						platform: "discord",
				  };

			const json = JSON.stringify(
				EmbedHelper.getTemplateRaw(
					EmbedHelper.getColorWithFallback(undefined, guildColor),
					await EmbedHelper.getCheckOutFooter(
						client.formatting,
						place,
						client.helpCommands,
						commandUsed
					)
				)
			);

			ctx.set("Content-Type", "application/json");
			ctx.body = json;
		});
	}
}
