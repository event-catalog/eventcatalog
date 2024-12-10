import { BoltIcon } from '@heroicons/react/16/solid';
import { ArrowsRightLeftIcon } from '@heroicons/react/20/solid';
import type { CollectionMessageTypes, CollectionTypes } from '@types';
import type { CollectionEntry } from 'astro:content';
import { Handle } from '@xyflow/react';

interface Data {
  title: string;
  label: string;
  bgColor: string;
  color: string;
  mode: 'simple' | 'full';
  channel: CollectionEntry<'channels'>;
  source: CollectionEntry<CollectionMessageTypes>;
  target: CollectionEntry<CollectionMessageTypes>;
  showTarget?: boolean;
  showSource?: boolean;
}

function classNames(...classes: any) {
  return classes.filter(Boolean).join(' ');
}

import * as ProtocolIcons from '@icons/protocols';
import { LinkIcon } from '@heroicons/react/24/outline';

const protocolIcons = Object.keys(ProtocolIcons).reduce(
  (icons, key) => {
    const iconKey = key as keyof typeof ProtocolIcons;
    icons[key.toLowerCase()] = ProtocolIcons[iconKey];
    return icons;
  },
  {} as { [key: string]: string }
);

const getIconForProtocol = (icon: keyof typeof protocolIcons) => {
  const Icon = protocolIcons[icon];
  return Icon ? (props: any) => <span {...props} dangerouslySetInnerHTML={{ __html: Icon }} /> : null;
};

export default function ChannelNode({ data, sourcePosition, targetPosition }: any) {
  const { mode, channel, source, target } = data as Data;

  const { id, name, version, summary, owners = [], address, protocols = [] } = channel.data;
  const protocol = protocols[0];

  const Icon = getIconForProtocol(protocol);

  const getAddress = () => {
    const sourceChannel = source.data.channels?.find((channel) => channel.id === id);
    const targetChannel = target.data.channels?.find((channel) => channel.id === id);
    const sourceParams = sourceChannel?.parameters || {};
    const targetParams = targetChannel?.parameters || {};
    const params = { ...sourceParams, ...targetParams };

    let updatedAddress = address;
    if (params) {
      Object.keys(params).forEach((key) => {
        const placeholder = `{${key}}`;
        if (updatedAddress && updatedAddress.includes(placeholder)) {
          updatedAddress = updatedAddress.replace(new RegExp(`{${key}}`, 'g'), params[key]);
        }
      });
    }

    return updatedAddress;
  };

  return (
    <div
      className={classNames(
        mode === 'simple' ? 'min-h-[3em]' : 'min-h-[6.5em]',
        'w-full rounded-md border flex justify-start  bg-white text-black border-gray-400 transform  '
      )}
    >
      <div
        className={classNames(
          'bg-gradient-to-b from-gray-500 to-gray-700 relative flex items-center w-5 justify-center rounded-l-sm text-gray-100-500',
          `border-r-[1px] border-gray-500`
        )}
      >
        <ArrowsRightLeftIcon className="w-4 h-4 opacity-90 text-white absolute top-1 " />
        {mode === 'full' && (
          <span className="rotate -rotate-90 w-1/2 text-center absolute bottom-1 text-[9px] text-white font-bold uppercase tracking-[3px] ">
            Channel
          </span>
        )}
      </div>
      <div className="p-1 min-w-60 max-w-[min-content]">
        {targetPosition && <Handle type="target" position={targetPosition} />}
        {sourcePosition && <Handle type="source" position={sourcePosition} />}
        <div className={classNames(mode === 'full' ? `border-b border-gray-200` : '')}>
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold block pb-0.5">{name}</span>
            {Icon && <Icon className="w-5 h-5 opacity-60 p-0.5" />}
          </div>
          <div className="flex justify-between">
            <span className="text-[10px] font-light block pt-0.5 pb-0.5 ">v{version}</span>
            {mode === 'simple' && <span className="text-[10px] text-gray-500 font-light block pt-0.5 pb-0.5 ">Channel</span>}
          </div>
        </div>
        {mode === 'full' && (
          <div className="divide-y divide-gray-200 ">
            <div className="leading-[10px] py-1 ">
              <span className="text-[8px] font-light">{summary}</span>
            </div>
            {address && (
              <div className="leading-3 py-1 flex flex-col items-start space-y-0.5">
                <div className="text-[6px] flex items-center space-x-0.5 ">
                  <LinkIcon className="w-2 h-2 opacity-60" />
                  <span className="block font-normal ">{getAddress()}</span>
                </div>
                {protocols.length > 0 && (
                  <div className="text-[6px] font-semibold flex space-x-2 items-center ">
                    {[...protocols].map((protocol, index) => {
                      const ProtoColIcon = getIconForProtocol(protocol);
                      return (
                        <span key={index} className="font-normal flex items-center -ml-[1px] space-x-0.5">
                          {ProtoColIcon && <ProtoColIcon className="w-2 h-2 opacity-60 inline-block" />}
                          <span>{protocol}</span>
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
