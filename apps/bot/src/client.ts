import {
  Client,
  Collection,
  type AutocompleteInteraction,
  type ButtonInteraction,
  type ChatInputCommandInteraction,
  type ModalSubmitInteraction,
  type RESTPostAPIChatInputApplicationCommandsJSONBody,
  type RESTPostAPIContextMenuApplicationCommandsJSONBody,
  type StringSelectMenuInteraction,
  type UserContextMenuCommandInteraction,
} from "discord.js";

/**
 * Structural type covering every SlashCommandBuilder variant (plain,
 * with-subcommands, options-only) — discord.js's own builder generics
 * make a single shared type awkward, and all we actually need from `data`
 * is its name and its serialized JSON body for registration.
 */
export interface CommandData {
  name: string;
  toJSON(): RESTPostAPIChatInputApplicationCommandsJSONBody;
}

export interface BotCommand {
  data: CommandData;
  execute(interaction: ChatInputCommandInteraction): Promise<void>;
  /** Only needed by commands with a `setAutocomplete(true)` option (e.g. picking one of your own characters). */
  autocomplete?(interaction: AutocompleteInteraction): Promise<void>;
}

/** A right-click "Apps" user-context-menu command — a standalone top-level command, distinct from a chat-input BotCommand. */
export interface ContextMenuCommand {
  data: { name: string; toJSON(): RESTPostAPIContextMenuApplicationCommandsJSONBody };
  execute(interaction: UserContextMenuCommandInteraction): Promise<void>;
}

/**
 * A component (button/modal) handler is matched by customId PREFIX, not
 * exact match — e.g. "personnage:delete:confirm" matches
 * "personnage:delete:confirm:<characterId>", letting a single handler
 * cover every instance of that button/modal regardless of the id it
 * carries.
 */
export interface ButtonHandler {
  customIdPrefix: string;
  execute(interaction: ButtonInteraction): Promise<void>;
}

export interface ModalHandler {
  customIdPrefix: string;
  execute(interaction: ModalSubmitInteraction): Promise<void>;
}

/** Same prefix-match dispatch as ButtonHandler/ModalHandler — first needed by the ticket panel's category picker (M35). */
export interface SelectMenuHandler {
  customIdPrefix: string;
  execute(interaction: StringSelectMenuInteraction): Promise<void>;
}

export class BotClient extends Client {
  readonly commands = new Collection<string, BotCommand>();
  readonly contextMenuCommands = new Collection<string, ContextMenuCommand>();
  readonly buttonHandlers: ButtonHandler[] = [];
  readonly modalHandlers: ModalHandler[] = [];
  readonly selectMenuHandlers: SelectMenuHandler[] = [];
}
