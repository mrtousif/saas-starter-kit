import { slugify } from '@/lib/common';
import { ApiError } from '@/lib/errors';
import { createTeam, getTeams, isTeamExists } from 'models/team';
import type { NextApiRequest, NextApiResponse } from 'next';
import { recordMetric } from '@/lib/metrics';
import { createTeamSchema } from '@/lib/zod/schema';
import { getCurrentUser } from 'models/user';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { method } = req;

  try {
    switch (method) {
      case 'GET':
        await handleGET(req, res);
        break;
      case 'POST':
        await handlePOST(req, res);
        break;
      default:
        res.setHeader('Allow', 'GET, POST');
        res.status(405).json({
          error: { message: `Method ${method} Not Allowed` },
        });
    }
  } catch (error: any) {
    const message = error.message || 'Something went wrong';
    const status = error.status || 500;

    res.status(status).json({ error: { message } });
  }
}

// Get teams
const handleGET = async (req: NextApiRequest, res: NextApiResponse) => {
  const user = await getCurrentUser(req, res);
  const teams = await getTeams(user.id);

  recordMetric('team.fetched');

  res.status(200).json({ data: teams });
};

// Create a team
const handlePOST = async (req: NextApiRequest, res: NextApiResponse) => {
  const { name } = createTeamSchema.parse(req.body);

  const user = await getCurrentUser(req, res);
  const slug = slugify(name);

  if (await isTeamExists([{ slug }])) {
    throw new ApiError(400, 'A team with the name already exists.');
  }

  const team = await createTeam({
    userId: user.id,
    name,
    slug,
  });

  recordMetric('team.created');

  res.status(200).json({ data: team });
};
