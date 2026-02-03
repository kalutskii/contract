#!/usr/bin/env bun

import { getClipanionClient } from '@/adapters/clipanion.client';
import { BuildCommand } from '@/modules/build/build.commands';
import { InitCommand, UpdateEnvironmentCommand } from '@/modules/init/init.commands';
import { SyncCommand } from '@/modules/sync/sync.commands';

const clipanionClient = getClipanionClient();

clipanionClient.register(InitCommand);
clipanionClient.register(UpdateEnvironmentCommand);
clipanionClient.register(BuildCommand);
clipanionClient.register(SyncCommand);
clipanionClient.runExit(process.argv.slice(2));
