import {
	BaseRouter,
	Client,
	FriendlyError,
	Logger,
	Utils,
} from "@framedjs/core";
import { oneLine } from "common-tags";
import { DatabaseManager } from "../../../managers/DatabaseManager";
import { CustomClient } from "../../../structures/CustomClient";

export default class extends BaseRouter {
	constructor(client: Client) {
		super(client);

		this.router.post(
			"/api/v0/dailies/version",
			async (ctx: {
				query: { version: any };
				status: number;
				body: any;
			}) => {
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
							Utils.util.format(
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
					ctx.body = error.message;
					ctx.status = 400;
				}
			}
		);
	}
}
