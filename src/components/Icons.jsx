// Font Awesome icon wrapper components
// Uses FA kit loaded via index.html

export function Icon({ name, className = "" }) {
  return <i className={`${name} ${className}`} />;
}

// Mode icons
export function FlipIcon({ className = "" }) {
  return <Icon name="fa-solid fa-clone" className={className} />;
}

export function StudyIcon({ className = "" }) {
  return <Icon name="fa-solid fa-book-open" className={className} />;
}

export function QuizIcon({ className = "" }) {
  return <Icon name="fa-solid fa-circle-question" className={className} />;
}

// Action icons
export function ShuffleIcon({ className = "" }) {
  return <Icon name="fa-solid fa-shuffle" className={className} />;
}

export function ChevronLeftIcon({ className = "" }) {
  return <Icon name="fa-solid fa-chevron-left" className={className} />;
}

export function ChevronRightIcon({ className = "" }) {
  return <Icon name="fa-solid fa-chevron-right" className={className} />;
}

export function VolumeIcon({ className = "" }) {
  return <Icon name="fa-solid fa-volume-high" className={className} />;
}

export function StopIcon({ className = "" }) {
  return <Icon name="fa-solid fa-stop" className={className} />;
}

export function RotateIcon({ className = "" }) {
  return <Icon name="fa-solid fa-rotate" className={className} />;
}

// Result icons
export function TrophyIcon({ className = "" }) {
  return <Icon name="fa-solid fa-trophy" className={className} />;
}

export function ThumbsUpIcon({ className = "" }) {
  return <Icon name="fa-solid fa-thumbs-up" className={className} />;
}

export function BookOpenIcon({ className = "" }) {
  return <Icon name="fa-solid fa-book" className={className} />;
}

// Status icons
export function CheckIcon({ className = "" }) {
  return <Icon name="fa-solid fa-check" className={className} />;
}

export function XMarkIcon({ className = "" }) {
  return <Icon name="fa-solid fa-xmark" className={className} />;
}

export function SpinnerIcon({ className = "" }) {
  return <Icon name="fa-solid fa-spinner fa-spin" className={className} />;
}
