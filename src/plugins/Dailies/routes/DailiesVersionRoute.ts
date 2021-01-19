import { BaseRouter, DatabaseManager, Client, Logger, Utils } from "framed.js";

export default class extends BaseRouter {
	constructor(client: Client) {
		super(client);

		this.router.post(
			"/api/v0/dailies/version",
			async (ctx: { query: { version: any }; status: number; body: any }) => {
				const version = ctx.query.version;
				Logger.debug(`Dailies version: ${version}`);
				try {
					if (!version) {
						throw new Error("No version query found in URL.");
					}

					const pluginRepo = client.database.pluginRepo;
					const id = "com.geekoverdrivestudio.dailies";
					const plugin = await pluginRepo.findOne({
						where: { id: id },
					});

					if (!plugin) {
						throw new ReferenceError(
							Utils.util.format(DatabaseManager.errorNoConnection, "plugin", id)
						);
					}

					plugin.data.version = version;
					await pluginRepo.save(plugin);

					ctx.status = 201;
				} catch (error) {
					ctx.body = error.message;
					ctx.status = 400;
				}
			}
		);
	}
}
