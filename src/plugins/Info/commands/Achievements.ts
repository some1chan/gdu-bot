import {
	BaseCommand,
	BaseMessage,
	BasePlugin,
	Discord,
	DiscordInteraction,
	DiscordMessage,
	EmbedHelper,
	Logger,
} from "@framedjs/core";
import { oneLine, stripIndents } from "common-tags";

export default class extends BaseCommand {
	constructor(plugin: BasePlugin) {
		super(plugin, {
			id: "achievements",
			about: "Info about Game Dev Underground achievements.",
			botPermissions: {
				discord: {
					permissions: ["EMBED_LINKS"],
				},
			},
		});
	}

	async run(msg: BaseMessage): Promise<boolean> {
		if (
			msg instanceof DiscordMessage ||
			msg instanceof DiscordInteraction
		) {
			const embed = EmbedHelper.getTemplate(
				msg.discord,
				await EmbedHelper.getCheckOutFooter(msg, this.id),
				new Discord.MessageEmbed({
					title: "Game Dev Underground Achievements",
					description: stripIndents`${oneLine`
					We are introducing achievements to the <:gdu:766718483983368212> **Game Dev Underground** Discord server!
					They work similar to achievements in video games (but who even plays those anymore, right?).`}
					
					${oneLine`To unlock them, you must meet specific requirements that the <@&462342299171684364>
					and <@&758771336289583125> team will be looking out for.`}
					
					${oneLine`If we happen to miss anything, please tag one of us with proof, and we'll grant
					you the achievement role! More will be coming as time goes on, but in the meantime,
					feel free to drop your achievement ideas in <#574795552642826255>.`}`,
					fields: [
						{
							name: "Finisher",
							value: "<@&496099568467836931>  - Finish a game",
						},
						{
							name: "Going Mobile",
							value: "<@&817926418637520928> - Publish a game on mobile",
						},
						{
							name: "Letting off Steam",
							value: "<@&817926734505705472> - Publish a game on Steam",
						},
						{
							name: "Sir, Finishing this Game",
							value: "<@&817926736046063647> - Publish a game on an Xbox console",
						},
						{
							name: "For the Money... I Mean, Players",
							value: "<@&817926737513283611> - Publish a game on a PlayStation console",
						},
						{
							name: "Wii are so Proud of You",
							value: "<@&817926735857319947> - Publish a game on a Nintendo console",
						},
						{
							name: "Murder is an Artform",
							value: "<@&766429895382269952> - Win 10 Rounds of Art Attack",
						},
						{
							name: "Booty Clapper",
							value: "<@&492833405201940500> - Win a GDU Game Jam",
						},
					],
				})
			);
			await msg.send({
				embeds: [embed],
			});
		}
		return false;
	}
}
