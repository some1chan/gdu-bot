import { BaseProvider, Client } from "@framedjs/core";
import * as TypeORM from "typeorm";
import { TypeORMPlaceProvider } from "./TypeORMPlaceProvider";
import { TypeORMPrefixProvider } from "./TypeORMPrefixProvider";
import { TypeORMSettingsProvider } from "./TypeORMSettingsProvider";
import Place from "../database/entities/Place";
import Prefix from "../database/entities/Prefix";
import Settings from "../database/entities/Settings";
import { DatabaseManager } from "../managers/DatabaseManager";

export class TypeORMProvider extends BaseProvider {
	connectionName?: string;

	constructor(client: Client, connectionName?: string) {
		super(client);
		this.connectionName = connectionName;
	}

	async init(): Promise<void> {
		const connection = TypeORM.getConnection(this.connectionName);
		if (!connection) {
			throw new ReferenceError(DatabaseManager.errorNotFound);
		}

		this.place = new TypeORMPlaceProvider(
			this,
			connection.getRepository(Place)
		);

		this.prefixes = new TypeORMPrefixProvider(
			this,
			connection.getRepository(Prefix)
		);

		this.settings = new TypeORMSettingsProvider(
			this,
			connection.getRepository(Settings)
		);

		await this.place.init();
		await Promise.all([this.prefixes.init(), this.settings.init()]);
	}
}
