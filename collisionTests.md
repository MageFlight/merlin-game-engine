## Step 1: Gather movements

Get all wanted movements from KinematicBodies. No actual movements or collision tests are done yet

## Step 2: Calculate collisions

Go through all of the movements and check for any collisions that would occur. If there is a collision, get the information about it, but don't actually move any of the colliders (Don't resolve it). In calculating the final position of the collision, don't snap the position to an edge, since that might interfere with the collision from the other collider's perspective

## Step 3: Resolve collisions

For all of the collisions that actually happened, go through them and resolve them. The velocities and positions during the collision will stored with the collision. This is so that if there were two colliders moving towards each other, one wouldn't resolve on the other's resolution. Instead, they will meet in the middle.


# Kinematic Pushable v. StaticBody or Kinematic Unpushable v. Kinematic Unpushable

## Definitions

Collider A: Kinematic Pushable
Collider B: StaticBody or Kinematic Unpushable
Collider C: Kinematic Unpushable 2

## Issue

Collider A has a velocity that would put it inside of Collider B. The collision is detected and the resolution is calculated, keeping the player where it was and resetting the y-velocity, as the collision normal was <0, -1>. Then, Collider C is updated with a velocity that would put it inside of Collider A.

```
   +---+    |
   | C |    | Velocity: <0, 0.5>
   +---+    V
   +---+    | 
   | A |    | Velocity: <0, 0.1>
   +---+    V
   +---+
   | B |
   +---+
```

Collider C's next movement is ambigious because Collider C doesn't know that Collider A is on the ground. This means that Collider C will keep going into Collider A, in theory. In practice (Commit c79dc77)

## Solution

 1. Update all of the pushable kinematicBodies before the unpushables.
 2. If the pushable kinematicBody hits an unpushable kinematic body, or a staticBody, flag the collider (pushable kinematicBody) as unpushable along the collision normal.
 3. If an unpushable kinematicBody collides with a pushable, check for the unpushable flag, and if it was unpushable, use the unpushable vs. unpushable resolution for that axis only. On the other axis, treat it like a normal pushable vs. unpushable collision.

make disable collision work


## Pushable vs. static

 1. Collider A goes to the side of Collider B that corresponds to the normal and moves under its own velocity on the other
 2. The velocity of Collider A is reset along the normal

## Pushable vs. Pushable

Collider A goes to collision position along the normal, and moves under its own velocity on the other, Collider B goes to the side of Collider A that corresponds to the normal, and moves under its own velocity on the other.

Swap velocities

## Pushable vs. Unpushable

 1. Collider B moves by its velocity times delta time
 2. Collider A goes to the side of Collider B that corresponds to the normal and moves under its own velocity on the other.
 3. The relative velocity along the collision normal is added to the velocity of Collider A

## Unpushable vs. Pushable

 1. Collider A moves by its velocity times delta time
 2. Collider B goes to the side of Collider A that corresponds to the inverse normal and moves under its own velocity on the other.
 3. The relative velocity along the collision normal is added to the velocity of Collider A

## Unpushable vs. Static

 1. Collider A goes to the side of Collider B that corresponds to the normal and moves under its own velocity on the other
 2. The velocity of Collider A is reset along the normal

## Unpushable vs. Unpushable

 1. Collider A goes to the collision position along the normal, and moves under its own velocity on the other
 2. Collider B goes to the side of Collider A that corresponds to the normal and moves under its own velocity on the other
 2. Along the normal, the velocities of both colliders are set to 0

## Static vs. Static

Should never happen