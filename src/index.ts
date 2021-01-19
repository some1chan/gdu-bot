// https://www.stefanjudis.com/today-i-learned/measuring-execution-time-more-precisely-in-the-browser-and-node-js/
const startTime = process.hrtime();

import { TypeORMLogger } from "./logger/TypeORMLogger";
import * as Framed from "framed.js";
import Colors from "colors";
import Winston from "winston";
import fs from "fs";
import path from "path";

// Sets up loggers
const Logger = Framed.Logger;
Logger.level = process.env.LOGGER_LEVEL ? process.env.LOGGER_LEVEL : "silly";
const format = Winston.format;
const DbLogger = Winston.createLogger({
	level: process.env.TYPEORM_WINSTON_LOGGER_LEVEL,
	levels: TypeORMLogger.defaultLevels.levels,
	format: format.combine(
		format.colorize({
			colors: TypeORMLogger.defaultLevels.colors,
		}),
		format.timestamp({
			format: "HH:mm:ss",
		}),
		format.printf((info) => {
			const timestamp = Colors.gray(`[${info.timestamp}]`);
			return `${timestamp} ${info.level}: ${info.message}`;
		})
	),
	transports: [new Winston.transports.Console()],
});

// Gets the version of the app
let appVersion: string | undefined;
try {
	const packageFile = fs.readFileSync(
		path.resolve(__dirname, "../package.json"),
		"utf8"
	);
	const packageJson = JSON.parse(packageFile);
	appVersion = packageJson.version;
} catch (error) {
	Logger.error(error.stack);
}

Logger.info(`Starting GDU Bot v${appVersion}, currently running Framed.js v${Framed.version}.`);
Logger.info(`${Framed.Utils.hrTimeElapsed(startTime)}s - Loaded imports.`);

// Initializes Client
const client = new Framed.Client({
	defaultConnection: {
		type: "sqlite",
		database: `${__dirname}${path.sep}..${path.sep}data${path.sep}FramedDB.sqlite`,
		synchronize: true,
		dropSchema: false,
		logger: new TypeORMLogger(DbLogger, "all"),
		entities: [Framed.DatabaseManager.defaultEntitiesPath],
	},
	defaultPrefix: process.env.DEFAULT_PREFIX,
	appVersion: appVersion,
});

// Creates login data
const loginData: Framed.LoginOptions[] = [
	{
		type: "discord",
		discord: {
			token: process.env.DISCORD_TOKEN,
		},
	},
];

if (
	process.env.TWITCH_ACCESS_TOKEN &&
	process.env.TWITCH_CLIENT_ID &&
	process.env.TWITCH_CLIENT_SECRET &&
	process.env.TWITCH_REFRESH_TOKEN &&
	process.env.TWITCH_CHANNELS
) {
	// If all the environmental variable values exist, push Twitch as a possible login
	loginData.push({
		type: "twitch",
		twitch: {
			accessToken: process.env.TWITCH_ACCESS_TOKEN,
			clientId: process.env.TWITCH_CLIENT_ID,
			clientSecret: process.env.TWITCH_CLIENT_SECRET,
			refreshToken: process.env.TWITCH_REFRESH_TOKEN,
			clientOptions: {
				channels: process.env.TWITCH_CHANNELS.split(","),
				logger: {
					// name: "",
					timestamps: false,
					// colors: false,
					emoji: false,
				},
			},
		},
	});
}

// Load plugins
client.plugins.loadPluginsIn({
	dirname: path.join(__dirname, "plugins"),
	filter: /^(.+plugin)\.(js|ts)$/,
	excludeDirs: /^(.*)\.(git|svn)$|^(.*)subcommands(.*)$/,
});

Logger.info(`${Framed.Utils.hrTimeElapsed(startTime)}s - Loaded custom plugins.`);

// Login
client.login(loginData).then(async () => {
	Logger.info(
		`Done (${Framed.Utils.hrTimeElapsed(startTime)}s)! Framed.js v${
			Framed.version
		} has been loaded.`
	);
});
