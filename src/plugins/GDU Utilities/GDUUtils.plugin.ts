import { BasePlugin, Client } from "@framedjs/core";
import path from "path";

export default class extends BasePlugin {
	constructor(client: Client) {
		super(client, {
			id: "io.gdu.utils",
			name: "GDU Utilities",
			description: "Helper commands for GDU.",
			version: "0.1.0",
			paths: {
				commands: path.join(__dirname, "commands"),
				events: path.join(__dirname, "events"),
			},
			groupEmote: "🔧",
			groupName: "GDU Utilities",
		});
	}
}