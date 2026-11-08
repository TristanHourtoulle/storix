import dns, { type LookupAddress, type LookupOptions } from 'node:dns'
import { BlockList, isIP, type LookupFunction } from 'node:net'

const REFUSED_ADDRESS_CODE = 'EPUSHADDR'

const NON_PUBLIC_RANGES: readonly (readonly [string, number, 'ipv4' | 'ipv6'])[] = [
  ['0.0.0.0', 8, 'ipv4'],
  ['10.0.0.0', 8, 'ipv4'],
  ['100.64.0.0', 10, 'ipv4'],
  ['127.0.0.0', 8, 'ipv4'],
  ['169.254.0.0', 16, 'ipv4'],
  ['172.16.0.0', 12, 'ipv4'],
  ['192.0.0.0', 24, 'ipv4'],
  ['192.0.2.0', 24, 'ipv4'],
  ['192.88.99.0', 24, 'ipv4'],
  ['192.168.0.0', 16, 'ipv4'],
  ['198.18.0.0', 15, 'ipv4'],
  ['198.51.100.0', 24, 'ipv4'],
  ['203.0.113.0', 24, 'ipv4'],
  ['224.0.0.0', 3, 'ipv4'],
  ['::', 96, 'ipv6'],
  ['::ffff:0:0:0', 96, 'ipv6'],
  ['64:ff9b::', 96, 'ipv6'],
  ['64:ff9b:1::', 48, 'ipv6'],
  ['100::', 64, 'ipv6'],
  ['2001::', 32, 'ipv6'],
  ['2001:db8::', 32, 'ipv6'],
  ['fc00::', 7, 'ipv6'],
  ['fe80::', 10, 'ipv6'],
  ['fec0::', 10, 'ipv6'],
  ['ff00::', 8, 'ipv6'],
]

const nonPublicAddresses = NON_PUBLIC_RANGES.reduce((list, [network, prefix, family]) => {
  list.addSubnet(network, prefix, family)
  return list
}, new BlockList())

const SIX_TO_FOUR = new BlockList()
SIX_TO_FOUR.addSubnet('2002::', 16, 'ipv6')

function expandIPv6(address: string): number[] {
  const [head, tail] = address.includes('::') ? address.split('::') : [address, undefined]
  const groups = (part: string | undefined) => (part ? part.split(':') : [])
  const left = groups(head)
  const right = groups(tail)
  const zeros = tail === undefined ? [] : Array<string>(8 - left.length - right.length).fill('0')
  return [...left, ...zeros, ...right].map((group) => Number.parseInt(group, 16))
}

function sixToFourEmbeddedIPv4(address: string): string | null {
  if (address.includes('.')) return null
  const [, high, low] = expandIPv6(address)
  if (high === undefined || low === undefined) return null
  return [high >> 8, high & 0xff, low >> 8, low & 0xff].join('.')
}

/**
 * True when the IP literal is not publicly routable (loopback, private, link-local, CGNAT, documentation, multicast,
 * IPv4-compatible, Teredo, or a 6to4 address embedding such an IPv4) or is not an IP. IPv4-mapped IPv6 hits the IPv4 rules.
 */
export function isNonPublicAddress(address: string): boolean {
  const family = isIP(address)
  if (family === 0) return true
  if (family === 4) return nonPublicAddresses.check(address, 'ipv4')
  if (nonPublicAddresses.check(address, 'ipv6')) return true
  if (!SIX_TO_FOUR.check(address, 'ipv6')) return false
  const embedded = sixToFourEmbeddedIPv4(address.toLowerCase())
  return embedded === null || isNonPublicAddress(embedded)
}

function refusedAddressError(): NodeJS.ErrnoException {
  return Object.assign(new Error('Refused a non-public push service address'), {
    code: REFUSED_ADDRESS_CODE,
  })
}

/** DNS lookup that fails when any resolved address is not publicly routable. */
export const publicOnlyLookup: LookupFunction = (hostname, options: LookupOptions, callback) => {
  dns.lookup(hostname, { ...options, all: true }, (error, addresses: LookupAddress[]) => {
    if (error) {
      callback(error, '', 0)
      return
    }
    const first = addresses[0]
    if (first === undefined || addresses.some(({ address }) => isNonPublicAddress(address))) {
      callback(refusedAddressError(), '', 0)
      return
    }
    if (options.all === true) callback(null, addresses)
    else callback(null, first.address, first.family)
  })
}
