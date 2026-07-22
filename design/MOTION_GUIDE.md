# Motion

Motion communicates continuity.

Never decoration.

Never spectacle.

Every animation should help the user understand what changed.

If motion doesn't improve comprehension, remove it.

Principles

Motion preserves context.

Interfaces should feel stable.

Elements transform instead of appearing.

State changes should feel inevitable, never surprising.

Movement should reduce cognitive load, not increase it.

Preferred Motion

Use motion that reinforces spatial relationships.

Prefer:

- Layout transitions
- Shared element transitions
- Spring animations
- Fade
- Blur reveal
- Progressive disclosure
- Opacity transitions
- Micro-translations (2–8 px)
- Subtle scale (1 → 1.01)
- Hover feedback
- Focus transitions
- Toast notifications
- Skeleton → Content transitions
- Counter animations

Every animation should feel almost invisible.

Avoid

Avoid motion that attracts attention to itself.

Never use:

Bounce
Elastic effects
Overshoot
Rotation
Spin loaders
Flash
Zoom-in effects
Long fades
Large parallax
Flying components
Decorative transitions

The user should remember the task, not the animation.

Timing

Motion should be fast enough to disappear.

Interaction	Duration
Hover	120–160 ms
Press	80–120 ms
Small state change	150–200 ms
Layout transition	180–250 ms
Modal / Sheet	200–250 ms
Navigation	200–250 ms

Ease:

Ease Out
Soft Spring
Critically damped springs

Avoid exaggerated easing curves.

Transformations

Prefer transformation over replacement.

Good

Button
↓

Loading Button
↓

Success

Not

Button

↓

Disappear

↓

Spinner

↓

Disappear

↓

Success

Users should always know where things went.

Progressive Disclosure

Reveal complexity gradually.

Instead of showing everything at once:

Expand sections
Reveal secondary actions
Fade supporting information
Animate height changes
Maintain scroll position

Never overwhelm the user with simultaneous movement.

Depth

Depth should be almost imperceptible.

Use:

4–12 px backdrop blur
Slight transparency
Very soft shadows
Gentle elevation changes

Depth reinforces hierarchy.

Never decoration.

Feedback

Interactions should acknowledge the user instantly.

Examples:

Button press
Toggle switch
Checkbox
Input focus
Selection state
Drag feedback
Successful actions
Error states

Feedback should appear within 100 ms whenever possible.

Lists & Tables

Preserve orientation.

When data changes:

Animate insertions
Animate removals
Animate sorting
Animate filtering
Preserve row positions whenever possible

Never rebuild the entire list.

The user should always know what changed.

Navigation

Navigation should preserve place.

Pages should transition through:

Shared headers
Shared cards
Shared images
Shared containers

Avoid blank screens between views.

Navigation should feel like moving through one continuous space.

Loading States

Loading should preserve layout.

Prefer:

Skeletons
Progressive rendering
Blur placeholders
Incremental content reveal

Avoid:

Empty screens
Global spinners
Flashing loaders

The interface should remain stable while data arrives.

Micro-interactions

Micro-interactions should reward attention without demanding it.

Examples:

Hover elevation
Focus rings
Active states
Cursor feedback
Copy confirmation
Inline validation
Selection highlights

Keep them subtle.

Users should feel them more than notice them.

Accessibility

Motion must never become a barrier.

Respect prefers-reduced-motion
Remove non-essential animations
Keep essential transitions instant
Never rely on motion alone to communicate state

Accessibility always takes precedence over aesthetics.

Design Test

Before adding an animation, ask:

Does it preserve continuity?
Does it clarify what changed?
Does it reduce cognitive effort?
Would the interface still work without it?

If the answer is no, remove it.

Motion Philosophy

Motion should feel like physics, not choreography.

The interface should never perform for the user.
It should quietly explain itself through movement.

The best animation is the one the user never consciously notices, yet would miss if it disappeared.