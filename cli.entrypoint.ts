#!/usr/bin/env bun

import { getClipanionClient } from '@/adapters/clipanion.client';
import { BuildCommand } from '@/modules/build/build.commands';
import { InitCommand, UpdateEnvironmentCommand } from '@/modules/init/init.commands';
import { PackPackageCommand } from '@/modules/pack/pack.commands';
import { PreparePackageCommand } from '@/modules/prepare/prepare.commands';
import { PublishPackageCommand } from '@/modules/publish/publish.commands';

const clipanionClient = getClipanionClient();

clipanionClient.register(InitCommand);
clipanionClient.register(UpdateEnvironmentCommand);
clipanionClient.register(BuildCommand);
clipanionClient.register(PreparePackageCommand);
clipanionClient.register(PackPackageCommand);
clipanionClient.register(PublishPackageCommand);
clipanionClient.runExit(process.argv.slice(2));
