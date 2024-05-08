import { Request, Response } from 'express'
import { Injectable } from '@nestjs/common'
import StatusCodes from 'enums/StatusCodes'
import { SendRes } from 'lib/sendRes.service'
import { MiscService } from 'lib/misc.service'
import { PrismaService } from 'lib/prisma.service'
import { newsFeedDto } from './adminitor/dto/infite-scroll.dto'

@Injectable()
export class AppService {
  constructor(
    private readonly misc: MiscService,
    private readonly response: SendRes,
    private readonly prisma: PrismaService,
  ) { }

  getHello(): string {
    return 'Prednetwork'
  }

  async newsFeed(
    req: Request,
    res: Response,
    { limit = 9, page = 1, tab }: newsFeedDto
  ) {
    try {
      page = Number(page)
      limit = Number(limit)

      // @ts-ignore
      const sub = req.user?.sub
      const currentDate = new Date()
      const offset = (page - 1) * limit

      let articlesToFetch = ['nonBoostedArticles']
      let followingArticles: any[] = []

      if (tab === 'for_you') {
        articlesToFetch = ['boostedArticles', 'randomArticles', ...articlesToFetch]
      } else if (tab === 'following' && sub) {
        const followedUsers = await this.prisma.follow.findMany({
          where: {
            followerId: sub
          },
          select: {
            followingId: true
          }
        })

        const followedUserIds = followedUsers.map(user => user.followingId)
        followingArticles = await this.prisma.article.findMany({
          where: {
            pending_approval: false,
            authorId: {
              in: followedUserIds
            }
          },
          select: {
            id: true,
            title: true,
            views: true,
            content: true,
            categories: true,
            coverPhoto: true,
            readingTime: true,
            publishedAt: true,
            author: {
              select: {
                id: true,
                username: true,
                fullname: true,
                profile: {
                  select: {
                    avatar: true
                  }
                }
              }
            },
            adminitor: {
              select: {
                id: true,
                avatar: true,
                fullname: true,
              }
            }
          },
          orderBy: {
            publishedAt: 'desc'
          },
          skip: offset,
          take: limit
        })
      }

      const fetchedArticles = {}

      await Promise.all(articlesToFetch.map(async (articleType) => {
        switch (articleType) {
          case 'boostedArticles':
            fetchedArticles[articleType] = await this.prisma.boosting.findMany({
              where: {
                boosting_expiry: {
                  gte: currentDate
                }
              },
              select: {
                article: {
                  select: {
                    id: true,
                    title: true,
                    views: true,
                    content: true,
                    categories: true,
                    coverPhoto: true,
                    readingTime: true,
                    publishedAt: true,
                    author: {
                      select: {
                        id: true,
                        username: true,
                        fullname: true,
                        profile: {
                          select: {
                            avatar: true
                          }
                        }
                      }
                    },
                    adminitor: {
                      select: {
                        id: true,
                        avatar: true,
                        fullname: true,
                      }
                    }
                  }
                },
                boosting_point: true
              },
              orderBy: {
                boosting_point: 'desc'
              },
              skip: offset,
              take: limit
            })
            break

          case 'randomArticles':
            const randomArticles = await this.misc.fetchRandomArticles(limit)
            fetchedArticles[articleType] = randomArticles
            break

          case 'nonBoostedArticles':
            fetchedArticles[articleType] = await this.prisma.article.findMany({
              where: {
                pending_approval: false,
                boosting: null,
              },
              select: {
                id: true,
                title: true,
                views: true,
                content: true,
                categories: true,
                coverPhoto: true,
                readingTime: true,
                publishedAt: true,
                author: {
                  select: {
                    id: true,
                    username: true,
                    fullname: true,
                    profile: {
                      select: {
                        avatar: true
                      }
                    }
                  }
                },
                adminitor: {
                  select: {
                    id: true,
                    avatar: true,
                    fullname: true,
                  }
                }
              },
              orderBy: {
                publishedAt: 'desc'
              },
              skip: offset,
              take: limit
            })
            break
        }
      }))

      let allArticles = []

      articlesToFetch.forEach(articleType => {
        if (fetchedArticles[articleType]) {
          allArticles = allArticles.concat(fetchedArticles[articleType])
        }
      })

      const uniqueArticles = allArticles.filter((article, index, self) =>
        index === self.findIndex((t) => (
          t.id === article.id
        ))
      )

      uniqueArticles.forEach(article => {
        if (article?.content) {
          article.content = article.content.length > 75 ? article.content.substring(0, 75) + '...' : article.content
        }
      })

      let finalArticles = uniqueArticles

      if (tab === 'following') {
        finalArticles = finalArticles.concat(followingArticles)
      }

      this.response.sendSuccess(res, StatusCodes.OK, { data: finalArticles })
    } catch (err) {
      this.misc.handleServerError(res, err, 'Error fetching articles')
    }
  }

  async discoveryPage(res: Response) {
    try {
      const activeArticles = await this.prisma.article.findMany({
        where: { pending_approval: false }
      })

      const uniqueArticles = new Set()

      while (uniqueArticles.size < Math.min(activeArticles.length, 7)) {
        const randomIndex = Math.floor(Math.random() * activeArticles.length)
        const randomArticleId = activeArticles[randomIndex].id

        if (!uniqueArticles.has(randomArticleId)) {
          uniqueArticles.add(randomArticleId)
        }
      }

      const uniqueArticleIds = Array.from(uniqueArticles)

      const articles = await Promise.all(uniqueArticleIds.map(async (articleId: string) => {
        return await this.prisma.article.findUnique({
          where: { id: articleId },
          select: {
            id: true,
            title: true,
            views: true,
            content: true,
            categories: true,
            coverPhoto: true,
            readingTime: true,
            publishedAt: true,
            author: {
              select: {
                id: true,
                username: true,
                fullname: true,
                profile: {
                  select: {
                    avatar: true
                  }
                }
              }
            },
            adminitor: {
              select: {
                id: true,
                avatar: true,
                fullname: true,
              }
            }
          }
        })
      }))

      articles.forEach(article => {
        if (article?.content) {
          article.content = article.content.length > 75 ? article.content.substring(0, 75) + '...' : article.content
        }
      })

      this.response.sendSuccess(res, StatusCodes.OK, { data: articles })
    } catch (err) {
      this.misc.handleServerError(res, err)
    }
  }
}
