import { VM } from 'vm2'
import fetch from 'node-fetch'
import { createConsole } from './extensions/console'
import { PluginsServer, Plugin, PluginVM, VMMethod, PluginConfig } from './types'
import { PluginEvent } from 'posthog-plugins'
import { createCache } from './extensions/cache'
import { createInternalPostHogInstance } from 'posthog-js-lite'

export function createVm(plugin: Plugin, indexJs: string, libJs: string | null, server: PluginsServer) {
    const vm = new VM({
        sandbox: {},
    })
    vm.run("const exports = {};")
    vm.freeze(fetch, 'fetch') // Second argument adds object to global.
    vm.freeze(createConsole(), 'console')

    if (libJs) {
        vm.run(libJs)
    }
    vm.run(indexJs)

    const global = vm.run('global')
    const exports = vm.run('exports')

    return {
        vm,
        setupTeam: exports.setupTeam || global.setupTeam,
        processEvent: exports.processEvent || global.processEvent,
    }
}

export function prepareForRun(
    server: PluginsServer,
    pluginVM: PluginVM,
    teamId: number,
    pluginConfig: PluginConfig,
    method: VMMethod,
    event?: PluginEvent
) {
    if (!pluginVM) {
        return null
    }
    const { plugin, vm, [method]: pluginFunction } = pluginVM
    if (!pluginFunction) {
        return null
    }
    const meta = {
        team: pluginConfig.team_id,
        order: pluginConfig.order,
        name: plugin.name,
        tag: plugin.tag,
        config: pluginConfig.config,
    }

    vm.freeze(createCache(server, plugin.name, teamId), 'cache')

    if (event?.properties?.token) {
        const posthog = createInternalPostHogInstance(
            event.properties.token,
            { apiHost: event.site_url, fetch },
            {
                performance: require('perf_hooks').performance,
            }
        )
        vm.freeze(posthog, 'posthog')
    } else {
        vm.freeze(null, 'posthog')
    }

    if (method === 'processEvent') {
        return (event: PluginEvent) => pluginVM['processEvent'](event, meta)
    } else if (method === 'setupTeam') {
        return () => pluginVM['setupTeam'](meta)
    }
}
