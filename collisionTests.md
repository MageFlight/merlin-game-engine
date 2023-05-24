## Step 1: Gather movements

Get all wanted movements from KinematicBodies. No actual movements or collision tests are done yet

## Step 2: Calculate collisions

Go through all of the movements and check for any collisions that would occur. If there is a collision, get the information about it, but don't actually move any of the colliders (Don't resolve it). In calculating the final position of the collision, don't snap the position to an edge, since that might interfere with the collision from the other collider's perspective

## Step 3: Resolve collisions

For all of the collisions that actually happened, go through them and resolve them. The velocities and positions during the collision will stored with the collision. This is so that if there were two colliders moving towards each other, one wouldn't resolve on the other's resolution. Instead, they will meet in the middle.