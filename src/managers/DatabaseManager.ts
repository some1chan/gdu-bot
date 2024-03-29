/* eslint-disable no-mixed-spaces-and-tabs */
import { Base, Client, Logger, Place, Utils } from "@framedjs/core";

import * as TypeORM from "typeorm";
import Plugin from "../database/entities/Plugin";
import Prefix from "../database/entities/Prefix";
import Command from "../database/entities/Command";
import Response from "../database/entities/Response";
import Group from "../database/entities/Group";
import { default as PlaceEntity } from "../database/entities/Place";
import { PrefixResolvable } from "../database/types/PrefixResolvable";
import { ResponseData } from "../database/interfaces/ResponseData";

import { SnowflakeUtil } from "discord.js";

export class DatabaseManager extends Base {
	static readonly errorNoConnection =
		"there is no connection to the database!";
	static readonly errorNotFound = `I couldn't find a %s with the name/ID "%s".`;
	static readonly errorAlreadyExists = `%s with ID "%s" already exists!`;
	static readonly errorAlreadyExistsName = `%s with ID "%s" (with name "%s") already exists!`;

	connection!: TypeORM.Connection;
	connectionName?: string;
	prefixRepo!: TypeORM.Repository<Prefix>;
	commandRepo!: TypeORM.Repository<Command>;
	responseRepo!: TypeORM.Repository<Response>;
	groupRepo!: TypeORM.Repository<Group>;
	pluginRepo!: TypeORM.Repository<Plugin>;
	placeRepo!: TypeORM.Repository<PlaceEntity>;

	constructor(client: Client, connectionName?: string) {
		super(client);

		this.connectionName = connectionName;
		this.connection = TypeORM.getConnection(this.connectionName);

		this.prefixRepo = this.connection.getRepository(Prefix);
		this.commandRepo = this.connection.getRepository(Command);
		this.responseRepo = this.connection.getRepository(Response);
		this.groupRepo = this.connection.getRepository(Group);
		this.placeRepo = this.connection.getRepository(PlaceEntity);
		this.pluginRepo = this.connection.getRepository(Plugin);
	}

	/**
	 * Connects to the database and installs
	 */
	async init(): Promise<void> {
		if (!this.connection) {
			throw new ReferenceError(DatabaseManager.errorNotFound);
		}

		const needsInstall = await this.checkNeedsInstall();

		// Generates default prefix, if none existed before
		if (needsInstall) {
			try {
				await this.installDefaults();
			} catch (error) {
				Logger.error(
					`Error happened while installing!\n${(error as Error).stack}`
				);
			}
		}
		await this.install();

		Logger.info("Initalized database manager");
	}

	//#region Install

	/**
	 * Checks whether or not Framed needs an install.
	 *
	 * @returns Returns `true` if the database is fresh
	 */
	async checkNeedsInstall(): Promise<boolean> {
		const connection = this.connection;
		if (!connection)
			throw new ReferenceError(DatabaseManager.errorNoConnection);

		// Gets defaults
		const defaultGroup = await this.getDefaultGroup();

		const groupReady = defaultGroup;

		// Will return true if everything is not ready
		return !groupReady;
	}

	/**
	 * Starts installing default entries in the database.
	 */
	async installDefaults(): Promise<void> {
		Logger.info(`Detected first-time run, installing defaults...`);

		const settled1 = await Promise.allSettled([
			this.addGroup("Other", "❔", "default", true),
		]);

		for (const settle of settled1) {
			switch (settle.status) {
				case "rejected":
					Logger.error(settle.reason);
					break;
			}
		}
	}

	/**
	 * Installs necessary data from scripts.
	 */
	async install(): Promise<void> {
		try {
			await this.addScriptGroups();
			await this.addScriptPlugins();
		} catch (error) {
			Logger.error(
				`Error happened while trying to install from scripts:\n${(error as Error).stack}`
			);
		}
	}
	//#endregion

	//#region Prefixes
	/**
	 * Adds a prefix
	 *
	 * @param prefix Prefix
	 * @param id Prefix ID. Defaults to a Discord Snowflake.
	 *
	 * @returns Created prefix
	 */
	async addPrefix(
		prefix: string,
		id = SnowflakeUtil.generate(),
		place: Place,
		bypassAlreadyExists = false
	): Promise<Prefix> {
		const connection = this.connection;
		if (!connection) {
			throw new Error(DatabaseManager.errorNoConnection);
		}

		const prefixRepo = connection.getRepository(Prefix);

		// Checks if the group already exists, and will throw an error if so
		// and the setting to bypass this is set to false
		if (!bypassAlreadyExists) {
			if (
				await prefixRepo.findOne({
					where: {
						prefixId: id,
						placeId: place.id,
					},
				})
			) {
				throw new ReferenceError(
					Utils.util.format(
						DatabaseManager.errorAlreadyExists,
						"prefix",
						`${id}" with place ${Utils.util.inspect(place)}`
					)
				);
			}
		}

		return prefixRepo.save(
			prefixRepo.create({
				prefixId: id,
				placeId: place.id,
				prefix: prefix,
			})
		);
	}

	/**
	 * Get the default prefix
	 */
	async getDefaultPrefix(
		place: Place,
		relations: string[] = []
	): Promise<Prefix> {
		const connection = this.connection;
		if (!connection) {
			throw new Error(DatabaseManager.errorNoConnection);
		}
		const prefixRepo = connection.getRepository(Prefix);

		let prefix = await prefixRepo.findOne({
			where: {
				prefixId: "default",
				placeId: place.id,
			},
			relations: relations,
		});
		if (!prefix) {
			prefix = await this.addPrefix(
				this.client.defaultPrefix,
				"default",
				place
			);
		}
		return prefix;
	}

	/**
	 * Finds a prefix with a resolvable, by its ID and name.
	 * Almost never this will return more than one, but this is
	 * just in case it does.
	 *
	 * @param prefixResolvable
	 *
	 * @returns Prefixes
	 */
	async findPrefixPossibilities(
		prefixResolvable: PrefixResolvable,
		place: Place,
		prefixRelations: string[] = []
	): Promise<Prefix[]> {
		if (prefixResolvable instanceof Prefix) return [prefixResolvable];

		// Name/ID
		const connection = this.connection;
		if (!connection) {
			throw new Error(DatabaseManager.errorNoConnection);
		}

		const prefixRepo = connection.getRepository(Prefix);
		const newPrefixes = await prefixRepo.find({
			where: [
				{
					prefixId: prefixResolvable,
					placeId: place.id,
				},
				{
					prefix: prefixResolvable,
					placeId: place.id,
				},
			],
			relations: prefixRelations,
		});

		return newPrefixes;
	}

	/**
	 * Finds and returns a single prefix entity, or undefined.
	 *
	 * @param prefixResolvable
	 *
	 * @returns Prefix entity or undefined
	 */
	async findPrefix(
		prefixResolvable: PrefixResolvable,
		place: Place,
		prefixRelations: string[] = []
	): Promise<Prefix | undefined> {
		const prefixes = await this.findPrefixPossibilities(
			prefixResolvable,
			place,
			prefixRelations
		);

		const prefixesFoundById: Prefix[] = [];
		const prefixesFoundByName: Prefix[] = [];

		for await (const prefix of prefixes) {
			// If the resolvable is the ID, it's good
			if (prefix.prefixId == prefixResolvable) {
				prefixesFoundById.push(prefix);
			} else {
				prefixesFoundByName.push(prefix);
			}
		}

		if (prefixesFoundById.length >= 1) {
			return prefixesFoundById[0];
		}

		if (prefixesFoundByName.length >= 1) {
			return prefixesFoundByName[0];
		}

		return undefined;
	}

	/**
	 * Deletes a prefix from the database
	 *
	 * @param id Prefix ID
	 * @param place Place data
	 */
	async deletePrefix(id: string, place: Place): Promise<void> {
		if (this.connection) {
			// Deletes command
			await this.connection
				.createQueryBuilder()
				.delete()
				.from(Prefix)
				.where("id = :id", {
					id: id,
				})
				.andWhere("placeId = :placeId", {
					placeId: place.id,
				})
				.andWhere("platform = :platform", {
					platform: place.platform,
				})
				.execute();
		} else {
			throw new Error(
				"No connection to database while trying to delete Prefix!"
			);
		}
	}

	//#endregion

	//#region Commands
	/**
	 * Finds a command in a database
	 *
	 * @param commandId Command ID
	 * @param prefix Prefix string
	 * @param place Place data
	 * @param prefixRelations
	 * @param commandRelations
	 *
	 * @returns Command object from database, or undefined
	 */
	async findCommand(
		commandId: string,
		prefix: string,
		place: Place,
		prefixRelations: string[] = ["commands"],
		commandRelations: string[] = [
			"defaultPrefix",
			"prefixes",
			"response",
			"group",
		]
	): Promise<Command | undefined> {
		const connection = this.connection;
		if (!connection) {
			throw new ReferenceError(DatabaseManager.errorNoConnection);
		}

		const commandRepo = connection.getRepository(Command);
		const prefixRepo = connection.getRepository(Prefix);
		const findingPrefixes = prefixRepo.find({
			where: {
				prefix: prefix,
				placeId: place.id,
			},
			relations: prefixRelations,
		});

		const findingCommand = commandRepo.findOne({
			where: {
				id: commandId,
				placeId: place.id,
				platform: place.platform,
			},
			relations: commandRelations,
		});

		const [foundPrefixes, foundCommand] = await Promise.all([
			findingPrefixes,
			findingCommand,
		]);

		if (foundCommand) {
			let matchingCommand: Command | undefined;

			// Attempts to match the prefix with the matching command ID
			foundPrefixes.forEach(prefix => {
				foundCommand.prefixes.forEach(cmdPrefix => {
					if (cmdPrefix.prefixId == prefix.prefixId) {
						matchingCommand = foundCommand;
					}
				});
			});

			return matchingCommand;
		}

		return undefined;
	}

	/**
	 * Adds a command.
	 *
	 * @param id Command ID string
	 * @param response Response entity
	 * @param defaultPrefix
	 * @param place Place data
	 * @param bypassAlreadyExists Bypasses the check for if the element
	 * already exists. Default is set to false.
	 *
	 * @returns New command
	 */
	async addCommand(
		id: string,
		response: Response,
		defaultPrefix: PrefixResolvable,
		place: Place,
		bypassAlreadyExists = false
	): Promise<Command> {
		const connection = this.connection;
		if (!connection) {
			throw new ReferenceError(DatabaseManager.errorNoConnection);
		}

		// Checks if the command already exists
		const commandRepo = connection.getRepository(Command);
		if (
			(await commandRepo.findOne({ where: { id: id } })) &&
			!bypassAlreadyExists
		) {
			throw new ReferenceError(
				Utils.util.format(
					DatabaseManager.errorAlreadyExists,
					"command",
					id
				)
			);
		}

		// Tries and writes the command. If it fails,
		// send an error message to console and delete the new response data.
		try {
			const prefix = await this.findPrefix(defaultPrefix, place);

			if (!prefix) {
				throw new ReferenceError(
					Utils.util.format(
						DatabaseManager.errorNotFound,
						defaultPrefix
					)
				);
			}

			const command = commandRepo.create({
				id: id.toLocaleLowerCase(),
				response: response,
				defaultPrefix: prefix,
				prefixes: [prefix],
			});

			return commandRepo.save(command);
		} catch (error) {
			// try {
			// 	await this.client.databaseManager.deleteResponse(
			// 		response.id
			// 	);
			// } catch (error) {
			// 	throw new Error(`Failed to delete response\n${(error as Error).stack}`);
			// }
			throw new Error(`Failed to add command\n${(error as Error).stack}`);
		}
	}

	/**
	 * Deletes command from the database
	 * @param id Command ID
	 */
	async deleteCommand(id: string): Promise<void> {
		const connection = this.connection;
		if (!connection) {
			throw new Error(DatabaseManager.errorNoConnection);
		}

		// Deletes command
		await connection
			.createQueryBuilder()
			.delete()
			.from(Command)
			.where("id = :id", {
				id: id,
			})
			.execute();
	}
	//#endregion

	//#region Responses

	/**
	 * Adds a response
	 *
	 * @param description
	 * @param list
	 *
	 * @returns Response
	 */
	async addResponse(
		description: string,
		list: ResponseData[],
		commands: Command[],
		id = SnowflakeUtil.generate(new Date()),
		bypassAlreadyExists = false
	): Promise<Response> {
		const connection = this.connection;
		if (!connection) {
			throw new ReferenceError(DatabaseManager.errorNoConnection);
		}

		const responseRepo = connection.getRepository(Response);

		if (
			(await responseRepo.findOne({ where: { id: id } })) &&
			!bypassAlreadyExists
		) {
			throw new ReferenceError(
				Utils.util.format(DatabaseManager.errorNotFound)
			);
		}

		// Add response, if command doesn't exist
		return await responseRepo.save(
			responseRepo.create({
				id: id,
				description: description,
				responseData: {
					list: list,
				},
				commandResponses: commands,
			})
		);
	}

	/**
	 * Deletes response from database
	 * @param id Response ID
	 */
	async deleteResponse(id: string): Promise<void> {
		if (this.connection) {
			// Deletes command
			await this.connection
				.createQueryBuilder()
				.delete()
				.from(Response)
				.where("id = :id", {
					id: id,
				})
				.execute();
		} else {
			throw new Error(
				"No connection to database while trying to delete Response!"
			);
		}
	}
	//#endregion

	//#region Groups

	/**
	 * Adds groups from scripts, such as plugins and commands.
	 */
	async addScriptGroups(): Promise<void> {
		const connection = this.connection;
		if (connection) {
			const groups: Group[] = [];
			const groupIds: string[] = [];
			const groupRepo = connection.getRepository(Group);

			for (const plugin of this.client.plugins.pluginsArray) {
				// If it doesn't exist, add it
				// if (!(await groupRepo.findOne(plugin.group))) {
				if (!groupIds.find(groupId => groupId == plugin.fullGroupId)) {
					groups.push(
						groupRepo.create({
							id: plugin.fullGroupId,
							emote: plugin.groupEmote,
							name: plugin.group,
						})
					);
					groupIds.push(plugin.fullGroupId);
				}
				// }

				// Scans for commands
				for await (const command of Array.from(
					plugin.commands.values()
				)) {
					// If it doesn't exist, add it
					// if (!(await groupRepo.findOne(command.group))) {
					// If the group ID doesn't exist already, add it
					if (
						!groupIds.find(groupId => groupId == plugin.fullGroupId)
					) {
						groups.push(
							groupRepo.create({
								id: plugin.fullGroupId,
								emote: command.groupEmote,
								name: command.group,
							})
						);
						groupIds.push(plugin.fullGroupId);
					}
					// }
				}
			}

			await groupRepo.save(groups);
		} else {
			throw new ReferenceError(DatabaseManager.errorNoConnection);
		}
	}

	/**
	 * Get the default group
	 */
	async getDefaultGroup(
		relations: string[] = []
	): Promise<Group | undefined> {
		const connection = this.connection;
		if (!connection) {
			throw new Error(DatabaseManager.errorNoConnection);
		}
		const groupRepo = connection.getRepository(Group);
		return groupRepo.findOne({
			where: {
				id: "default",
			},
			relations: relations,
		});
	}

	/**
	 * Adds a new group.
	 *
	 * @param name Name of the group
	 */
	async addGroup(
		name: string,
		emote?: string,
		id = SnowflakeUtil.generate(new Date()),
		bypassAlreadyExists = false
	): Promise<Group> {
		const connection = this.connection;
		if (!connection) {
			throw new ReferenceError(DatabaseManager.errorNoConnection);
		}

		const groupRepo = connection.getRepository(Group);

		// Checks if the group already exists, and will throw an error if so
		// and the setting to bypass this is set to false
		if (!bypassAlreadyExists) {
			if (await groupRepo.findOne({ where: { id: id } })) {
				throw new ReferenceError(
					Utils.util.format(
						DatabaseManager.errorAlreadyExists,
						"group",
						id
					)
				);
			}
		}

		return await groupRepo.save(
			groupRepo.create({
				id: id,
				name: name,
				emote: emote,
			})
		);
	}

	/**
	 * Edits an existing group by name
	 *
	 * @param oldNameOrId Name or ID of the group
	 */
	async editGroup(
		oldNameOrId: string,
		newName: string,
		newEmote?: string
	): Promise<Group> {
		if (newName.length == 0) {
			throw new ReferenceError("newName has to contain something!");
		}

		const connection = this.connection;
		if (connection) {
			const groupRepo = connection.getRepository(Group);
			const group = await this.findGroup(oldNameOrId);

			if (group) {
				return await groupRepo.save(
					groupRepo.create({
						id: group.id,
						commands: group.commands,
						emote: newEmote,
						name: newName,
					})
				);
			} else {
				throw new ReferenceError(
					`Couldn't find group with name "${oldNameOrId}"`
				);
			}
		} else {
			throw new ReferenceError(DatabaseManager.errorNoConnection);
		}
	}

	/**
	 * Deletes the group by name or IDF
	 * @param nameOrId Name or ID of the group
	 */
	async deleteGroup(nameOrId: string): Promise<void> {
		const connection = this.connection;
		if (connection) {
			const groupRepo = connection.getRepository(Group);
			const commandRepo = connection.getRepository(Command);
			const group = await this.findGroup(nameOrId, ["commands"]);
			const defaultGroup = await this.getDefaultGroup();

			if (!defaultGroup) {
				throw new ReferenceError(
					Utils.util.format(
						DatabaseManager.errorNotFound,
						"group",
						"default"
					)
				);
			}

			if (group) {
				if (group.id == "default") {
					throw new Error("You can't delete the default group!");
				}
				if (group.commands) {
					for (const command of group.commands) {
						command.group = defaultGroup;
					}

					await Promise.all(await commandRepo.save(group.commands));
				}

				// Deletes group
				// https://stackoverflow.com/questions/54246615/what-s-the-difference-between-remove-and-delete#54246681
				await groupRepo.remove(group);
			} else {
				throw new ReferenceError(
					Utils.util.format(
						DatabaseManager.errorNotFound,
						"group",
						nameOrId
					)
				);
			}
		} else {
			throw new ReferenceError(DatabaseManager.errorNoConnection);
		}
	}

	/**
	 * Finds a group by name or ID
	 * @param nameOrId Name or ID of the group
	 * @returns Group entity, or undefined if none found
	 */
	async findGroup(
		nameOrId: string,
		relations: string[] = []
	): Promise<Group | undefined> {
		const connection = this.connection;
		if (connection) {
			const groupRepo = connection.getRepository(Group);
			let newGroup = await groupRepo.findOne({
				where: { name: nameOrId },
				relations: relations,
			});
			if (!newGroup) {
				newGroup = await groupRepo.findOne({
					where: { id: nameOrId },
				});
			}
			return newGroup;
		} else {
			throw new ReferenceError(DatabaseManager.errorNoConnection);
		}
	}

	/**
	 * Sets a command's group
	 *
	 * @param commandName Command name
	 * @param nameOrId Name or ID of the group
	 * @param place
	 * @param commandPrefix
	 */
	async setGroup(
		commandName: string,
		nameOrId: string,
		place: Place,
		commandPrefix?: string
	): Promise<Group> {
		const connection = this.connection;
		if (connection) {
			const groupRepo = connection.getRepository(Group);
			const commandRepo = connection.getRepository(Command);
			const [group, prefix] = await Promise.all([
				this.findGroup(nameOrId, ["commands"]),
				this.client.provider.prefixes.get(place.id),
			]);

			if (group && prefix) {
				const command = await this.findCommand(
					commandName,
					commandPrefix ?? prefix,
					place
				);
				if (command) {
					const commands: Command[] = group.commands
						? group.commands.filter(value => value.id != group.id)
						: [];
					group.commands = [...commands, command];
					command.group = group;

					// There probably is something more faster and effiecient
					await commandRepo.save(command);
					return groupRepo.save(group);
				} else {
					throw new ReferenceError(
						`Couldn't find command with name "${commandName}"`
					);
				}
			} else {
				if (!prefix) {
					throw new ReferenceError(
						`Couldn't find prefix "${prefix}" with place ID "${place.id}"!`
					);
				} else if (!group) {
					throw new ReferenceError(
						`Couldn't find group with name "${nameOrId}"`
					);
				} else {
					throw new Error();
				}
			}
		} else {
			throw new ReferenceError(DatabaseManager.errorNoConnection);
		}
	}
	//#endregion

	//#region Plugins

	/**
	 * Adds plugin entries from scripts.
	 */
	async addScriptPlugins(): Promise<void> {
		const connection = this.connection;
		if (!connection) {
			throw new ReferenceError(DatabaseManager.errorNoConnection);
		}

		const pluginRepo = connection.getRepository(Plugin);
		const pluginsFound = await pluginRepo.find();

		// Adds an entry for all new plugins
		const plugins: TypeORM.DeepPartial<Plugin>[] = [];
		const installs: Promise<void>[] = [];
		const postInstalls: Promise<void>[] = [];
		for (const plugin of this.client.plugins.pluginsArray) {
			if (!pluginsFound.find(dbPlugin => dbPlugin.id == plugin.id)) {
				// Pushes into an array to create the plugin
				plugins.push({
					id: plugin.id,
					data: {},
				});
			}
		}
		await pluginRepo.save(plugins);

		// Handles installs for all plugins that are new
		for (const plugin of this.client.plugins.pluginsArray) {
			if (!pluginsFound.find(dbPlugin => dbPlugin.id == plugin.id)) {
				if (plugin.install) {
					installs.push(plugin.install());
				}
			}
		}

		await Promise.allSettled(installs);

		// Handles post installs for all plugins
		for (const plugin of this.client.plugins.pluginsArray) {
			if (plugin.postInstall) {
				postInstalls.push(plugin.postInstall());
			}
		}

		await Promise.allSettled(postInstalls);
	}

	/**
	 * Finds the plugin entry in the database
	 * @param pluginId Plugin ID
	 */
	async findPlugin(pluginId: string): Promise<Plugin | undefined> {
		const connection = this.connection;
		if (!connection) {
			throw new ReferenceError(DatabaseManager.errorNoConnection);
		}
		const pluginRepo = connection.getRepository(Plugin);
		return await pluginRepo.findOne({
			where: { id: pluginId },
		});
	}

	//#endregion
}
