const NodeGraphPortal = (props: any) => {
  return (
    <div
      className="h-[30em] my-6 mb-12 w-full relative border border-gray-200 rounded-md"
      id={`${props.id}-portal`}
      style={{
        maxHeight: props.maxHeight ? `${props.maxHeight}em` : `30em`,
      }}
    >
      {/* <span className="absolute top-2 right-4 bg-white font-bold z-10">{props.title}</span> */}
    </div>
  );
};

export default NodeGraphPortal;
