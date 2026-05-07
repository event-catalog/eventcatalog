type VisibilityProps = {
  for: 'agents' | 'humans';
  children?: any;
};

const Visibility = ({ for: audience, children }: VisibilityProps) => {
  if (audience !== 'humans') return null;

  return <>{children}</>;
};

export default Visibility;
