import EventNode from './EventNode'
import ProducerNode from './ProducerNode'
import SubscribeNode from './SubscribeNode'

const nodeTypes = {
  eventNode: EventNode,
  producerNode: ProducerNode,
  subscribeNode: SubscribeNode,
}

export default nodeTypes;