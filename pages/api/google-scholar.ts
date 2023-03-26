// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import axios from 'axios';
import * as xlsx from 'xlsx';
import {accounts} from "@/utils";

type Query = {
  q: string
  num: string,
  format: string,
  apiEmail?: string,
  apiKey?: string,
}

export type Response = {
  results: Array<object>,
  searchInformation: {
    total_results: number,
    time_taken_displayed: number,
    query_displayed: string,
  }
};

enum OutputFormat {
  JSON = 'JSON',
  EXCEL = 'EXCEL',
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Response>
) {
  try {
    const { q, num = '20', format = 'JSON', apiEmail, apiKey } = req.query as Query;
    const finalApiKey = getApiKey(apiEmail, apiKey);
    const googleResult = await getGoogleScholarResultBatch(q, Number(num), finalApiKey);
    const formattedData = getFormattedData(googleResult);
    if (format === OutputFormat.JSON) {
      res.status(200).json({ results: formattedData, searchInformation: googleResult.search_information })
    } else if (format === OutputFormat.EXCEL) {
      const fileBuffer = objectToExcel(formattedData);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      res.send(fileBuffer)
    }
  } catch (e) {
    // @ts-ignore
    res.status(500).json({ message: 'An error occurred', error: e });
  }
}

function objectToExcel(rows: Array<object>) {
  const worksheet = xlsx.utils.json_to_sheet(rows, { header: Object.keys(rows[0]) });
  const workbook = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(workbook, worksheet, "Data");
  return xlsx.write(workbook, { type: "buffer", bookType: "xlsx" });
}

async function getGoogleScholarResultBatch(q: string, num: number, apiKey: string) {
  const ITEMS_PER_PAGE = 20;
  const numOfPages: number = Math.ceil(num / ITEMS_PER_PAGE);
  const requestsResult = await Promise.all([...Array(numOfPages)].map(async (_, index) => {
    // return getGoogleResultMock();
    return getGoogleScholarResult(q, index * ITEMS_PER_PAGE, ITEMS_PER_PAGE, apiKey);
  }))
  return requestsResult.reduce(
    (out, result) => (
      { ...out, organic_results: [...out.organic_results, ...result.organic_results] }
    ),
    { ...requestsResult[0], organic_results: [] }
  )
}

async function getGoogleScholarResult(q: string, start: number, num: number, apiKey: string) {
  const { data } = await axios('https://serpapi.com/search', {
    params: {
      q,
      start,
      num,
      engine: 'google_scholar',
      api_key: apiKey,
    }
  })
  return data;
}

function getFormattedData(data: any) {
  return data.organic_results.map((result: any) => ({
    Title: result.title,
    Webpage: { v: result.link, l: { Target: result.link } },
    Download: result.resources?.[0] && { v: `${result.resources[0].title} (${result.resources[0].file_format})`, l: { Target: result.resources[0].link } },
    Publication: result.publication_info.summary?.match(/[,-] (\d+) - ([^-]+)$/)?.[2],
    Year: result.publication_info.summary?.match(/[,-] (\d+) - ([^-]+)$/)?.[1],
    Authors: result.publication_info.authors?.map((author: any) => author.name).join(', ') ?? '',
    'Cited by': result.inline_links?.cited_by?.total ?? '',
    Summary: result.publication_info.summary,
    Snippet: result.snippet,
  }))
}

export function getApiKey(apiEmail: string | undefined, apiKey: string | undefined) {
  if (apiKey) return apiKey;
  const selectedAccount = accounts.find(account => account.email === apiEmail)
  return selectedAccount?.apiKey || accounts[0].apiKey;
}

function getGoogleResultMock() {
  return {
    "search_metadata": {
      "id": "640a5f9aa1b423631f9322ad",
      "status": "Success",
      "json_endpoint": "https://serpapi.com/searches/f366969222ed7d1b/640a5f9aa1b423631f9322ad.json",
      "created_at": "2023-03-09 22:37:14 UTC",
      "processed_at": "2023-03-09 22:37:14 UTC",
      "google_scholar_url": "https://scholar.google.com/scholar?q=math&hl=en&num=21",
      "raw_html_file": "https://serpapi.com/searches/f366969222ed7d1b/640a5f9aa1b423631f9322ad.html",
      "total_time_taken": 2.35
    },
    "search_parameters": {
      "engine": "google_scholar",
      "q": "math",
      "hl": "en",
      "num": "20"
    },
    "search_information": {
      "organic_results_state": "Results for exact spelling",
      "total_results": 7340000,
      "time_taken_displayed": 0.12,
      "query_displayed": "math"
    },
    "organic_results": [
      {
        "position": 0,
        "title": "Math= male, me= female, therefore math≠ me.", // this
        "result_id": "VUHGsPgHk6wJ",
        "link": "https://psycnet.apa.org/journals/psp/83/1/44.html?uid=2002-01515-003",
        "snippet": "… A large body of literature already exists on the math-gender relationship, and it has used … first test using implicit measures of math attitude, math identity, math-gender stereotypes, and …", // this
        "publication_info": {
          "summary": "BA Nosek, MR Banaji… - Journal of personality and …, 2002 - psycnet.apa.org",  // this (separated by year and journal)
          "authors": [ // this
            {
              "name": "BA Nosek",
              "link": "https://scholar.google.com/citations?user=ztt_j28AAAAJ&hl=en&num=20&oi=sra",
              "serpapi_scholar_link": "https://serpapi.com/search.json?author_id=ztt_j28AAAAJ&engine=google_scholar_author&hl=en",
              "author_id": "ztt_j28AAAAJ"
            }
          ]
        },
        "resources": [
          {
            "title": "ashoka.edu.in",
            "file_format": "PDF",
            "link": "http://dspace.ashoka.edu.in/bitstream/123456789/4583/1/2002_Nosek_JPSP.pdf"
          }
        ],
        "inline_links": {
          "serpapi_cite_link": "https://serpapi.com/search.json?engine=google_scholar_cite&q=VUHGsPgHk6wJ",
          "cited_by": {
            "total": 1470, // this
            "link": "https://scholar.google.com/scholar?cites=12435291760799138133&as_sdt=40005&sciodt=0,10&hl=en&num=20",
            "cites_id": "12435291760799138133",
            "serpapi_scholar_link": "https://serpapi.com/search.json?as_sdt=40005&cites=12435291760799138133&engine=google_scholar&hl=en&num=20"
          },
          "related_pages_link": "https://scholar.google.com/scholar?q=related:VUHGsPgHk6wJ:scholar.google.com/&scioq=math&hl=en&num=20&as_sdt=0,10",
          "serpapi_related_pages_link": "https://serpapi.com/search.json?as_sdt=0%2C10&engine=google_scholar&hl=en&num=20&q=related%3AVUHGsPgHk6wJ%3Ascholar.google.com%2F",
          "versions": {
            "total": 25,
            "link": "https://scholar.google.com/scholar?cluster=12435291760799138133&hl=en&num=20&as_sdt=0,10",
            "cluster_id": "12435291760799138133",
            "serpapi_scholar_link": "https://serpapi.com/search.json?as_sdt=0%2C10&cluster=12435291760799138133&engine=google_scholar&hl=en&num=20"
          }
        }
      },
      {
        "position": 1,
        "title": "Culture, gender, and math",
        "result_id": "od-ev43Eu84J",
        "link": "https://www.science.org/doi/full/10.1126/science.1154094",
        "snippet": "… To investigate whether the disappearance of the math gender gap in some countries translates into an overall improvement of girls or is simply limited to mathematics scores, we …",
        "publication_info": {
          "summary": "L Guiso, F Monte, P Sapienza, L Zingales - Science, 2008 - science.org",
          "authors": [
            {
              "name": "L Guiso",
              "link": "https://scholar.google.com/citations?user=N1b97i8AAAAJ&hl=en&num=20&oi=sra",
              "serpapi_scholar_link": "https://serpapi.com/search.json?author_id=N1b97i8AAAAJ&engine=google_scholar_author&hl=en",
              "author_id": "N1b97i8AAAAJ"
            },
            {
              "name": "F Monte",
              "link": "https://scholar.google.com/citations?user=2KNY3AcAAAAJ&hl=en&num=20&oi=sra",
              "serpapi_scholar_link": "https://serpapi.com/search.json?author_id=2KNY3AcAAAAJ&engine=google_scholar_author&hl=en",
              "author_id": "2KNY3AcAAAAJ"
            },
            {
              "name": "P Sapienza",
              "link": "https://scholar.google.com/citations?user=sP8pxEMAAAAJ&hl=en&num=20&oi=sra",
              "serpapi_scholar_link": "https://serpapi.com/search.json?author_id=sP8pxEMAAAAJ&engine=google_scholar_author&hl=en",
              "author_id": "sP8pxEMAAAAJ"
            },
            {
              "name": "L Zingales",
              "link": "https://scholar.google.com/citations?user=dd-5oP4AAAAJ&hl=en&num=20&oi=sra",
              "serpapi_scholar_link": "https://serpapi.com/search.json?author_id=dd-5oP4AAAAJ&engine=google_scholar_author&hl=en",
              "author_id": "dd-5oP4AAAAJ"
            }
          ]
        },
        "resources": [
          {
            "title": "researchgate.net",
            "file_format": "PDF",
            "link": "https://www.researchgate.net/profile/Paola-Sapienza-2/publication/5338649_Diversity_Culture_gender_and_math/links/0deec520cce6bd9647000000/Diversity-Culture-gender-and-math.pdf"
          }
        ],
        "inline_links": {
          "serpapi_cite_link": "https://serpapi.com/search.json?engine=google_scholar_cite&q=od-ev43Eu84J",
          "cited_by": {
            "total": 1286,
            "link": "https://scholar.google.com/scholar?cites=14896716305542340513&as_sdt=40005&sciodt=0,10&hl=en&num=20",
            "cites_id": "14896716305542340513",
            "serpapi_scholar_link": "https://serpapi.com/search.json?as_sdt=40005&cites=14896716305542340513&engine=google_scholar&hl=en&num=20"
          },
          "related_pages_link": "https://scholar.google.com/scholar?q=related:od-ev43Eu84J:scholar.google.com/&scioq=math&hl=en&num=20&as_sdt=0,10",
          "serpapi_related_pages_link": "https://serpapi.com/search.json?as_sdt=0%2C10&engine=google_scholar&hl=en&num=20&q=related%3Aod-ev43Eu84J%3Ascholar.google.com%2F",
          "versions": {
            "total": 18,
            "link": "https://scholar.google.com/scholar?cluster=14896716305542340513&hl=en&num=20&as_sdt=0,10",
            "cluster_id": "14896716305542340513",
            "serpapi_scholar_link": "https://serpapi.com/search.json?as_sdt=0%2C10&cluster=14896716305542340513&engine=google_scholar&hl=en&num=20"
          }
        }
      },
      {
        "position": 2,
        "title": "Compreending math",
        "result_id": "F_5myHzNdfMJ",
        "link": "https://www.heinemann.com/products/e00949.aspx",
        "snippet": "… But this kind of conceptual thinking seems more difficult in math than in language arts and … mathematics than ever before, and in Comprehending Math you’ll find out that much of math’s …",
        "publication_info": {
          "summary": "A Hyde - … reading strategies to teach mathematics, K-6. Estados …, 2006 - heinemann.com"
        },
        "inline_links": {
          "serpapi_cite_link": "https://serpapi.com/search.json?engine=google_scholar_cite&q=F_5myHzNdfMJ",
          "cited_by": {
            "total": 107,
            "link": "https://scholar.google.com/scholar?cites=17543153859313466903&as_sdt=40005&sciodt=0,10&hl=en&num=20",
            "cites_id": "17543153859313466903",
            "serpapi_scholar_link": "https://serpapi.com/search.json?as_sdt=40005&cites=17543153859313466903&engine=google_scholar&hl=en&num=20"
          },
          "related_pages_link": "https://scholar.google.com/scholar?q=related:F_5myHzNdfMJ:scholar.google.com/&scioq=math&hl=en&num=20&as_sdt=0,10",
          "serpapi_related_pages_link": "https://serpapi.com/search.json?as_sdt=0%2C10&engine=google_scholar&hl=en&num=20&q=related%3AF_5myHzNdfMJ%3Ascholar.google.com%2F",
          "cached_page_link": "https://scholar.googleusercontent.com/scholar?q=cache:F_5myHzNdfMJ:scholar.google.com/+math&hl=en&num=20&as_sdt=0,10"
        }
      },
      {
        "position": 3,
        "title": "The math wars",
        "result_id": "D69PoOn2EaIJ",
        "link": "https://journals.sagepub.com/doi/pdf/10.1177/0895904803260042",
        "snippet": "During the 1990s, the teaching of mathematics became the subject of heated … mathematical values; reformers claim that such curricula reflect a deeper, richer view of mathematics than …",
        "publication_info": {
          "summary": "AH Schoenfeld - Educational policy, 2004 - journals.sagepub.com",
          "authors": [
            {
              "name": "AH Schoenfeld",
              "link": "https://scholar.google.com/citations?user=npuK4DkAAAAJ&hl=en&num=20&oi=sra",
              "serpapi_scholar_link": "https://serpapi.com/search.json?author_id=npuK4DkAAAAJ&engine=google_scholar_author&hl=en",
              "author_id": "npuK4DkAAAAJ"
            }
          ]
        },
        "resources": [
          {
            "title": "researchgate.net",
            "file_format": "PDF",
            "link": "https://www.researchgate.net/profile/Alan-Schoenfeld-2/publication/228793650_The_math_wars/links/0deec520ec661a6608000000/The-math-wars.pdf"
          }
        ],
        "inline_links": {
          "serpapi_cite_link": "https://serpapi.com/search.json?engine=google_scholar_cite&q=D69PoOn2EaIJ",
          "cited_by": {
            "total": 794,
            "link": "https://scholar.google.com/scholar?cites=11678386792025796367&as_sdt=40005&sciodt=0,10&hl=en&num=20",
            "cites_id": "11678386792025796367",
            "serpapi_scholar_link": "https://serpapi.com/search.json?as_sdt=40005&cites=11678386792025796367&engine=google_scholar&hl=en&num=20"
          },
          "related_pages_link": "https://scholar.google.com/scholar?q=related:D69PoOn2EaIJ:scholar.google.com/&scioq=math&hl=en&num=20&as_sdt=0,10",
          "serpapi_related_pages_link": "https://serpapi.com/search.json?as_sdt=0%2C10&engine=google_scholar&hl=en&num=20&q=related%3AD69PoOn2EaIJ%3Ascholar.google.com%2F",
          "versions": {
            "total": 15,
            "link": "https://scholar.google.com/scholar?cluster=11678386792025796367&hl=en&num=20&as_sdt=0,10",
            "cluster_id": "11678386792025796367",
            "serpapi_scholar_link": "https://serpapi.com/search.json?as_sdt=0%2C10&cluster=11678386792025796367&engine=google_scholar&hl=en&num=20"
          }
        }
      },
      {
        "position": 4,
        "title": "A meta-analysis of the relation between math anxiety and math achievement.",
        "result_id": "lTB9qBNFKVwJ",
        "link": "https://psycnet.apa.org/doiLanding?doi=10.1037/bul0000307",
        "snippet": "… math anxiety than for statistics anxiety and for certain math anxiety scales, and is smaller for math exam grades and samples selected for low math … effective math achievement and math …",
        "publication_info": {
          "summary": "C Barroso, CM Ganley, AL McGraw, EA Geer… - Psychological …, 2021 - psycnet.apa.org",
          "authors": [
            {
              "name": "C Barroso",
              "link": "https://scholar.google.com/citations?user=egqWhj8AAAAJ&hl=en&num=20&oi=sra",
              "serpapi_scholar_link": "https://serpapi.com/search.json?author_id=egqWhj8AAAAJ&engine=google_scholar_author&hl=en",
              "author_id": "egqWhj8AAAAJ"
            },
            {
              "name": "CM Ganley",
              "link": "https://scholar.google.com/citations?user=e3mdimgAAAAJ&hl=en&num=20&oi=sra",
              "serpapi_scholar_link": "https://serpapi.com/search.json?author_id=e3mdimgAAAAJ&engine=google_scholar_author&hl=en",
              "author_id": "e3mdimgAAAAJ"
            },
            {
              "name": "EA Geer",
              "link": "https://scholar.google.com/citations?user=WB9SnjYAAAAJ&hl=en&num=20&oi=sra",
              "serpapi_scholar_link": "https://serpapi.com/search.json?author_id=WB9SnjYAAAAJ&engine=google_scholar_author&hl=en",
              "author_id": "WB9SnjYAAAAJ"
            }
          ]
        },
        "resources": [
          {
            "title": "apa.org",
            "file_format": "PDF",
            "link": "https://psycnet.apa.org/manuscript/2020-80018-001.pdf"
          }
        ],
        "inline_links": {
          "serpapi_cite_link": "https://serpapi.com/search.json?engine=google_scholar_cite&q=lTB9qBNFKVwJ",
          "cited_by": {
            "total": 189,
            "link": "https://scholar.google.com/scholar?cites=6640915076267978901&as_sdt=40005&sciodt=0,10&hl=en&num=20",
            "cites_id": "6640915076267978901",
            "serpapi_scholar_link": "https://serpapi.com/search.json?as_sdt=40005&cites=6640915076267978901&engine=google_scholar&hl=en&num=20"
          },
          "related_pages_link": "https://scholar.google.com/scholar?q=related:lTB9qBNFKVwJ:scholar.google.com/&scioq=math&hl=en&num=20&as_sdt=0,10",
          "serpapi_related_pages_link": "https://serpapi.com/search.json?as_sdt=0%2C10&engine=google_scholar&hl=en&num=20&q=related%3AlTB9qBNFKVwJ%3Ascholar.google.com%2F",
          "versions": {
            "total": 13,
            "link": "https://scholar.google.com/scholar?cluster=6640915076267978901&hl=en&num=20&as_sdt=0,10",
            "cluster_id": "6640915076267978901",
            "serpapi_scholar_link": "https://serpapi.com/search.json?as_sdt=0%2C10&cluster=6640915076267978901&engine=google_scholar&hl=en&num=20"
          }
        }
      },
      {
        "position": 5,
        "title": "On K3 surfaces with large Picard number",
        "result_id": "B4_YOVL-1KsJ",
        "type": "Pdf",
        "link": "http://web.math.ucsb.edu/~drm/papers/k3Picard.pdf",
        "snippet": "A K3 surface is a simply connected compact complex manifold of dimension two with a nowhere-vanishing holomorphic 2-form. K 3 surfaces have received much attention in the last 25 …",
        "publication_info": {
          "summary": "I Math - Invent. math, 1984 - math.ucsb.edu"
        },
        "resources": [
          {
            "title": "ucsb.edu",
            "file_format": "PDF",
            "link": "http://web.math.ucsb.edu/~drm/papers/k3Picard.pdf"
          }
        ],
        "inline_links": {
          "serpapi_cite_link": "https://serpapi.com/search.json?engine=google_scholar_cite&q=B4_YOVL-1KsJ",
          "cited_by": {
            "total": 424,
            "link": "https://scholar.google.com/scholar?cites=12381800904659603207&as_sdt=40005&sciodt=0,10&hl=en&num=20",
            "cites_id": "12381800904659603207",
            "serpapi_scholar_link": "https://serpapi.com/search.json?as_sdt=40005&cites=12381800904659603207&engine=google_scholar&hl=en&num=20"
          },
          "related_pages_link": "https://scholar.google.com/scholar?q=related:B4_YOVL-1KsJ:scholar.google.com/&scioq=math&hl=en&num=20&as_sdt=0,10",
          "serpapi_related_pages_link": "https://serpapi.com/search.json?as_sdt=0%2C10&engine=google_scholar&hl=en&num=20&q=related%3AB4_YOVL-1KsJ%3Ascholar.google.com%2F",
          "versions": {
            "total": 11,
            "link": "https://scholar.google.com/scholar?cluster=12381800904659603207&hl=en&num=20&as_sdt=0,10",
            "cluster_id": "12381800904659603207",
            "serpapi_scholar_link": "https://serpapi.com/search.json?as_sdt=0%2C10&cluster=12381800904659603207&engine=google_scholar&hl=en&num=20"
          }
        }
      },
      {
        "position": 6,
        "title": "The Jaime Escalante math program.",
        "result_id": "JEHmXqa-GIUJ",
        "link": "https://eric.ed.gov/?id=ED345942",
        "snippet": "This article describes the Jaime Escalante Math Program, a system that in 1989 helped an East Los Angeles high school set a record by administering over 450 Advanced Placement …",
        "publication_info": {
          "summary": "J Escalante - 1990 - ERIC"
        },
        "resources": [
          {
            "title": "ed.gov",
            "file_format": "PDF",
            "link": "https://files.eric.ed.gov/fulltext/ED345942.pdf"
          }
        ],
        "inline_links": {
          "serpapi_cite_link": "https://serpapi.com/search.json?engine=google_scholar_cite&q=JEHmXqa-GIUJ",
          "cited_by": {
            "total": 158,
            "link": "https://scholar.google.com/scholar?cites=9590625028251468068&as_sdt=40005&sciodt=0,10&hl=en&num=20",
            "cites_id": "9590625028251468068",
            "serpapi_scholar_link": "https://serpapi.com/search.json?as_sdt=40005&cites=9590625028251468068&engine=google_scholar&hl=en&num=20"
          },
          "related_pages_link": "https://scholar.google.com/scholar?q=related:JEHmXqa-GIUJ:scholar.google.com/&scioq=math&hl=en&num=20&as_sdt=0,10",
          "serpapi_related_pages_link": "https://serpapi.com/search.json?as_sdt=0%2C10&engine=google_scholar&hl=en&num=20&q=related%3AJEHmXqa-GIUJ%3Ascholar.google.com%2F",
          "versions": {
            "total": 3,
            "link": "https://scholar.google.com/scholar?cluster=9590625028251468068&hl=en&num=20&as_sdt=0,10",
            "cluster_id": "9590625028251468068",
            "serpapi_scholar_link": "https://serpapi.com/search.json?as_sdt=0%2C10&cluster=9590625028251468068&engine=google_scholar&hl=en&num=20"
          },
          "cached_page_link": "https://scholar.googleusercontent.com/scholar?q=cache:JEHmXqa-GIUJ:scholar.google.com/+math&hl=en&num=20&as_sdt=0,10"
        }
      },
      {
        "position": 7,
        "title": "A new perspective on women's math achievement.",
        "result_id": "3sbeKMADQb8J",
        "link": "https://psycnet.apa.org/record/1989-24048-001",
        "snippet": "… measures of mathematics achievement, girls receive better math grades … math experience facilitates their performance on standardized tests. The second hypothesis proposes that math …",
        "publication_info": {
          "summary": "MM Kimball - Psychological bulletin, 1989 - psycnet.apa.org"
        },
        "inline_links": {
          "serpapi_cite_link": "https://serpapi.com/search.json?engine=google_scholar_cite&q=3sbeKMADQb8J",
          "cited_by": {
            "total": 837,
            "link": "https://scholar.google.com/scholar?cites=13781300458584721118&as_sdt=40005&sciodt=0,10&hl=en&num=20",
            "cites_id": "13781300458584721118",
            "serpapi_scholar_link": "https://serpapi.com/search.json?as_sdt=40005&cites=13781300458584721118&engine=google_scholar&hl=en&num=20"
          },
          "related_pages_link": "https://scholar.google.com/scholar?q=related:3sbeKMADQb8J:scholar.google.com/&scioq=math&hl=en&num=20&as_sdt=0,10",
          "serpapi_related_pages_link": "https://serpapi.com/search.json?as_sdt=0%2C10&engine=google_scholar&hl=en&num=20&q=related%3A3sbeKMADQb8J%3Ascholar.google.com%2F",
          "versions": {
            "total": 7,
            "link": "https://scholar.google.com/scholar?cluster=13781300458584721118&hl=en&num=20&as_sdt=0,10",
            "cluster_id": "13781300458584721118",
            "serpapi_scholar_link": "https://serpapi.com/search.json?as_sdt=0%2C10&cluster=13781300458584721118&engine=google_scholar&hl=en&num=20"
          }
        }
      },
      {
        "position": 8,
        "title": "Gesturing gives children new ideas about math",
        "result_id": "b5k-XkZcGzgJ",
        "link": "https://journals.sagepub.com/doi/pdf/10.1111/j.1467-9280.2009.02297.x",
        "snippet": "How does gesturing help children learn? Gesturing might encourage children to extract meaning implicit in their hand movements. If so, children should be sensitive to the particular …",
        "publication_info": {
          "summary": "S Goldin-Meadow, SW Cook… - Psychological …, 2009 - journals.sagepub.com",
          "authors": [
            {
              "name": "S Goldin-Meadow",
              "link": "https://scholar.google.com/citations?user=bKb2gUoAAAAJ&hl=en&num=20&oi=sra",
              "serpapi_scholar_link": "https://serpapi.com/search.json?author_id=bKb2gUoAAAAJ&engine=google_scholar_author&hl=en",
              "author_id": "bKb2gUoAAAAJ"
            },
            {
              "name": "SW Cook",
              "link": "https://scholar.google.com/citations?user=Xy7ptMIAAAAJ&hl=en&num=20&oi=sra",
              "serpapi_scholar_link": "https://serpapi.com/search.json?author_id=Xy7ptMIAAAAJ&engine=google_scholar_author&hl=en",
              "author_id": "Xy7ptMIAAAAJ"
            }
          ]
        },
        "resources": [
          {
            "title": "nih.gov",
            "file_format": "HTML",
            "link": "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC2750886/"
          }
        ],
        "inline_links": {
          "serpapi_cite_link": "https://serpapi.com/search.json?engine=google_scholar_cite&q=b5k-XkZcGzgJ",
          "html_version": "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC2750886/",
          "cited_by": {
            "total": 641,
            "link": "https://scholar.google.com/scholar?cites=4042926547793779055&as_sdt=40005&sciodt=0,10&hl=en&num=20",
            "cites_id": "4042926547793779055",
            "serpapi_scholar_link": "https://serpapi.com/search.json?as_sdt=40005&cites=4042926547793779055&engine=google_scholar&hl=en&num=20"
          },
          "related_pages_link": "https://scholar.google.com/scholar?q=related:b5k-XkZcGzgJ:scholar.google.com/&scioq=math&hl=en&num=20&as_sdt=0,10",
          "serpapi_related_pages_link": "https://serpapi.com/search.json?as_sdt=0%2C10&engine=google_scholar&hl=en&num=20&q=related%3Ab5k-XkZcGzgJ%3Ascholar.google.com%2F",
          "versions": {
            "total": 14,
            "link": "https://scholar.google.com/scholar?cluster=4042926547793779055&hl=en&num=20&as_sdt=0,10",
            "cluster_id": "4042926547793779055",
            "serpapi_scholar_link": "https://serpapi.com/search.json?as_sdt=0%2C10&cluster=4042926547793779055&engine=google_scholar&hl=en&num=20"
          }
        }
      },
      {
        "position": 9,
        "title": "Noninvasive diagnosis of deep venous thrombosis",
        "result_id": "N4E0vu2IcYcJ",
        "link": "https://www.acpjournals.org/doi/abs/10.7326/0003-4819-128-8-199804150-00011",
        "snippet": "Purpose: To review noninvasive methods for diagnosis of first and recurrent deep venous thrombosis and provide evidence-based recommendations for the diagnosis of deep venous …",
        "publication_info": {
          "summary": "C Kearon, JA Julian, M Math, TE Newman… - Annals of internal …, 1998 - acpjournals.org",
          "authors": [
            {
              "name": "C Kearon",
              "link": "https://scholar.google.com/citations?user=d0r006YAAAAJ&hl=en&num=20&oi=sra",
              "serpapi_scholar_link": "https://serpapi.com/search.json?author_id=d0r006YAAAAJ&engine=google_scholar_author&hl=en",
              "author_id": "d0r006YAAAAJ"
            },
            {
              "name": "JA Julian",
              "link": "https://scholar.google.com/citations?user=ah2ePbwAAAAJ&hl=en&num=20&oi=sra",
              "serpapi_scholar_link": "https://serpapi.com/search.json?author_id=ah2ePbwAAAAJ&engine=google_scholar_author&hl=en",
              "author_id": "ah2ePbwAAAAJ"
            }
          ]
        },
        "inline_links": {
          "serpapi_cite_link": "https://serpapi.com/search.json?engine=google_scholar_cite&q=N4E0vu2IcYcJ",
          "cited_by": {
            "total": 965,
            "link": "https://scholar.google.com/scholar?cites=9759732422168314167&as_sdt=40005&sciodt=0,10&hl=en&num=20",
            "cites_id": "9759732422168314167",
            "serpapi_scholar_link": "https://serpapi.com/search.json?as_sdt=40005&cites=9759732422168314167&engine=google_scholar&hl=en&num=20"
          },
          "related_pages_link": "https://scholar.google.com/scholar?q=related:N4E0vu2IcYcJ:scholar.google.com/&scioq=math&hl=en&num=20&as_sdt=0,10",
          "serpapi_related_pages_link": "https://serpapi.com/search.json?as_sdt=0%2C10&engine=google_scholar&hl=en&num=20&q=related%3AN4E0vu2IcYcJ%3Ascholar.google.com%2F",
          "versions": {
            "total": 9,
            "link": "https://scholar.google.com/scholar?cluster=9759732422168314167&hl=en&num=20&as_sdt=0,10",
            "cluster_id": "9759732422168314167",
            "serpapi_scholar_link": "https://serpapi.com/search.json?as_sdt=0%2C10&cluster=9759732422168314167&engine=google_scholar&hl=en&num=20"
          }
        }
      },
      {
        "position": 10,
        "title": "Explaining math: Gesturing lightens the load",
        "result_id": "mDTeRN6qVfAJ",
        "link": "https://journals.sagepub.com/doi/pdf/10.1111/1467-9280.00395",
        "snippet": "Why is it that people cannot keep their hands still when they talk? One reason may be that gesturing actually lightens cognitive load while a person is thinking of what to say. We asked …",
        "publication_info": {
          "summary": "S Goldin-Meadow, H Nusbaum… - Psychological …, 2001 - journals.sagepub.com",
          "authors": [
            {
              "name": "S Goldin-Meadow",
              "link": "https://scholar.google.com/citations?user=bKb2gUoAAAAJ&hl=en&num=20&oi=sra",
              "serpapi_scholar_link": "https://serpapi.com/search.json?author_id=bKb2gUoAAAAJ&engine=google_scholar_author&hl=en",
              "author_id": "bKb2gUoAAAAJ"
            },
            {
              "name": "H Nusbaum",
              "link": "https://scholar.google.com/citations?user=Xem7bJgAAAAJ&hl=en&num=20&oi=sra",
              "serpapi_scholar_link": "https://serpapi.com/search.json?author_id=Xem7bJgAAAAJ&engine=google_scholar_author&hl=en",
              "author_id": "Xem7bJgAAAAJ"
            }
          ]
        },
        "resources": [
          {
            "title": "free.fr",
            "file_format": "PDF",
            "link": "http://wexler.free.fr/library/files/goldin-meadow%20%282001%29%20explaining%20math.%20gesturing%20lightens%20the%20load.pdf"
          }
        ],
        "inline_links": {
          "serpapi_cite_link": "https://serpapi.com/search.json?engine=google_scholar_cite&q=mDTeRN6qVfAJ",
          "cited_by": {
            "total": 1050,
            "link": "https://scholar.google.com/scholar?cites=17317935813737985176&as_sdt=40005&sciodt=0,10&hl=en&num=20",
            "cites_id": "17317935813737985176",
            "serpapi_scholar_link": "https://serpapi.com/search.json?as_sdt=40005&cites=17317935813737985176&engine=google_scholar&hl=en&num=20"
          },
          "related_pages_link": "https://scholar.google.com/scholar?q=related:mDTeRN6qVfAJ:scholar.google.com/&scioq=math&hl=en&num=20&as_sdt=0,10",
          "serpapi_related_pages_link": "https://serpapi.com/search.json?as_sdt=0%2C10&engine=google_scholar&hl=en&num=20&q=related%3AmDTeRN6qVfAJ%3Ascholar.google.com%2F",
          "versions": {
            "total": 13,
            "link": "https://scholar.google.com/scholar?cluster=17317935813737985176&hl=en&num=20&as_sdt=0,10",
            "cluster_id": "17317935813737985176",
            "serpapi_scholar_link": "https://serpapi.com/search.json?as_sdt=0%2C10&cluster=17317935813737985176&engine=google_scholar&hl=en&num=20"
          }
        }
      },
      {
        "position": 11,
        "title": "Gender similarities characterize math performance",
        "result_id": "-X1uXgcgHuYJ",
        "link": "https://www.science.org/doi/full/10.1126/science.1160364",
        "snippet": "… in mathematics performance and ability remain a concern as scientists seek to address the underrepresentation of women at the highest levels of mathematics… NAEP mathematics score …",
        "publication_info": {
          "summary": "JS Hyde, SM Lindberg, MC Linn, AB Ellis, CC Williams - Science, 2008 - science.org",
          "authors": [
            {
              "name": "JS Hyde",
              "link": "https://scholar.google.com/citations?user=CuGici0AAAAJ&hl=en&num=20&oi=sra",
              "serpapi_scholar_link": "https://serpapi.com/search.json?author_id=CuGici0AAAAJ&engine=google_scholar_author&hl=en",
              "author_id": "CuGici0AAAAJ"
            },
            {
              "name": "SM Lindberg",
              "link": "https://scholar.google.com/citations?user=FgWXTckAAAAJ&hl=en&num=20&oi=sra",
              "serpapi_scholar_link": "https://serpapi.com/search.json?author_id=FgWXTckAAAAJ&engine=google_scholar_author&hl=en",
              "author_id": "FgWXTckAAAAJ"
            },
            {
              "name": "MC Linn",
              "link": "https://scholar.google.com/citations?user=RVbPgUgAAAAJ&hl=en&num=20&oi=sra",
              "serpapi_scholar_link": "https://serpapi.com/search.json?author_id=RVbPgUgAAAAJ&engine=google_scholar_author&hl=en",
              "author_id": "RVbPgUgAAAAJ"
            },
            {
              "name": "AB Ellis",
              "link": "https://scholar.google.com/citations?user=PwxaHLMAAAAJ&hl=en&num=20&oi=sra",
              "serpapi_scholar_link": "https://serpapi.com/search.json?author_id=PwxaHLMAAAAJ&engine=google_scholar_author&hl=en",
              "author_id": "PwxaHLMAAAAJ"
            },
            {
              "name": "CC Williams",
              "link": "https://scholar.google.com/citations?user=oEiXla4AAAAJ&hl=en&num=20&oi=sra",
              "serpapi_scholar_link": "https://serpapi.com/search.json?author_id=oEiXla4AAAAJ&engine=google_scholar_author&hl=en",
              "author_id": "oEiXla4AAAAJ"
            }
          ]
        },
        "resources": [
          {
            "title": "haifa.ac.il",
            "file_format": "PDF",
            "link": "https://ymath.haifa.ac.il/images/stories/part3/teachers/articles/english/gender_and_math_performance.pdf"
          }
        ],
        "inline_links": {
          "serpapi_cite_link": "https://serpapi.com/search.json?engine=google_scholar_cite&q=-X1uXgcgHuYJ",
          "cited_by": {
            "total": 1514,
            "link": "https://scholar.google.com/scholar?cites=16581726094045904377&as_sdt=40005&sciodt=0,10&hl=en&num=20",
            "cites_id": "16581726094045904377",
            "serpapi_scholar_link": "https://serpapi.com/search.json?as_sdt=40005&cites=16581726094045904377&engine=google_scholar&hl=en&num=20"
          },
          "related_pages_link": "https://scholar.google.com/scholar?q=related:-X1uXgcgHuYJ:scholar.google.com/&scioq=math&hl=en&num=20&as_sdt=0,10",
          "serpapi_related_pages_link": "https://serpapi.com/search.json?as_sdt=0%2C10&engine=google_scholar&hl=en&num=20&q=related%3A-X1uXgcgHuYJ%3Ascholar.google.com%2F",
          "versions": {
            "total": 17,
            "link": "https://scholar.google.com/scholar?cluster=16581726094045904377&hl=en&num=20&as_sdt=0,10",
            "cluster_id": "16581726094045904377",
            "serpapi_scholar_link": "https://serpapi.com/search.json?as_sdt=0%2C10&cluster=16581726094045904377&engine=google_scholar&hl=en&num=20"
          }
        }
      },
      {
        "position": 12,
        "title": "Book Review: All You Need Is Math: A Review of What's Math Got to Do With It?: Helping Children Learn to Love Their Least Favorite Subject-and Why It's Important …",
        "result_id": "ZY45vJ6VqbAJ",
        "link": "https://pubs.nctm.org/abstract/journals/jrme/40/4/article-p460.xml",
        "snippet": "… mathematics is taught using complex problems that engage students and that result in … mathematical activity. Peressini (1998) studied the patronizing portrayal of parents in mathematics …",
        "publication_info": {
          "summary": "WG Secada - Journal for Research in Mathematics Education, 2009 - pubs.nctm.org"
        },
        "inline_links": {
          "serpapi_cite_link": "https://serpapi.com/search.json?engine=google_scholar_cite&q=ZY45vJ6VqbAJ",
          "cited_by": {
            "total": 222,
            "link": "https://scholar.google.com/scholar?cites=12729870330734677605&as_sdt=40005&sciodt=0,10&hl=en&num=20",
            "cites_id": "12729870330734677605",
            "serpapi_scholar_link": "https://serpapi.com/search.json?as_sdt=40005&cites=12729870330734677605&engine=google_scholar&hl=en&num=20"
          },
          "related_pages_link": "https://scholar.google.com/scholar?q=related:ZY45vJ6VqbAJ:scholar.google.com/&scioq=math&hl=en&num=20&as_sdt=0,10",
          "serpapi_related_pages_link": "https://serpapi.com/search.json?as_sdt=0%2C10&engine=google_scholar&hl=en&num=20&q=related%3AZY45vJ6VqbAJ%3Ascholar.google.com%2F",
          "versions": {
            "total": 5,
            "link": "https://scholar.google.com/scholar?cluster=12729870330734677605&hl=en&num=20&as_sdt=0,10",
            "cluster_id": "12729870330734677605",
            "serpapi_scholar_link": "https://serpapi.com/search.json?as_sdt=0%2C10&cluster=12729870330734677605&engine=google_scholar&hl=en&num=20"
          }
        }
      },
      {
        "position": 13,
        "title": "What math knowledge does teaching require?",
        "result_id": "z-7h9yxYhSIJ",
        "link": "https://pubs.nctm.org/downloadpdf/journals/tcm/17/4/article-p220.xml",
        "snippet": "… Intrigued by the problem of identifying the mathematical knowledge and skill that actually contribute to student learning, we and our colleagues at the University of Michigan directly …",
        "publication_info": {
          "summary": "MH Thames, DL Ball - Teaching children mathematics, 2010 - pubs.nctm.org",
          "authors": [
            {
              "name": "DL Ball",
              "link": "https://scholar.google.com/citations?user=qdho5P0AAAAJ&hl=en&num=20&oi=sra",
              "serpapi_scholar_link": "https://serpapi.com/search.json?author_id=qdho5P0AAAAJ&engine=google_scholar_author&hl=en",
              "author_id": "qdho5P0AAAAJ"
            }
          ]
        },
        "inline_links": {
          "serpapi_cite_link": "https://serpapi.com/search.json?engine=google_scholar_cite&q=z-7h9yxYhSIJ",
          "cited_by": {
            "total": 187,
            "link": "https://scholar.google.com/scholar?cites=2487491319352651471&as_sdt=40005&sciodt=0,10&hl=en&num=20",
            "cites_id": "2487491319352651471",
            "serpapi_scholar_link": "https://serpapi.com/search.json?as_sdt=40005&cites=2487491319352651471&engine=google_scholar&hl=en&num=20"
          },
          "related_pages_link": "https://scholar.google.com/scholar?q=related:z-7h9yxYhSIJ:scholar.google.com/&scioq=math&hl=en&num=20&as_sdt=0,10",
          "serpapi_related_pages_link": "https://serpapi.com/search.json?as_sdt=0%2C10&engine=google_scholar&hl=en&num=20&q=related%3Az-7h9yxYhSIJ%3Ascholar.google.com%2F",
          "versions": {
            "total": 3,
            "link": "https://scholar.google.com/scholar?cluster=2487491319352651471&hl=en&num=20&as_sdt=0,10",
            "cluster_id": "2487491319352651471",
            "serpapi_scholar_link": "https://serpapi.com/search.json?as_sdt=0%2C10&cluster=2487491319352651471&engine=google_scholar&hl=en&num=20"
          }
        }
      },
      {
        "position": 14,
        "title": "Winning at math",
        "result_id": "_hGHdOmTof8J",
        "type": "Book",
        "link": "https://books.google.com/books?hl=en&lr=&id=ACem4L9U1L4C&oi=fnd&pg=PR7&dq=math&ots=BJmqH4Rlh0&sig=RFdHW1MNSjZRsA4LYrkyhNPLdK0",
        "snippet": "Every student must pass math courses to graduate. Doing well in math can both increase your career choices and allow you to graduate.\" Winning at Math\" will help you improve your …",
        "publication_info": {
          "summary": "PD Nolting - 1997 - books.google.com"
        },
        "resources": [
          {
            "title": "skylineuniversity.ac.ae",
            "file_format": "PDF",
            "link": "https://www.skylineuniversity.ac.ae/pdf/math/WINNING%20AT%20MATH.pdf"
          }
        ],
        "inline_links": {
          "serpapi_cite_link": "https://serpapi.com/search.json?engine=google_scholar_cite&q=_hGHdOmTof8J",
          "cited_by": {
            "total": 111,
            "link": "https://scholar.google.com/scholar?cites=18420166581813711358&as_sdt=40005&sciodt=0,10&hl=en&num=20",
            "cites_id": "18420166581813711358",
            "serpapi_scholar_link": "https://serpapi.com/search.json?as_sdt=40005&cites=18420166581813711358&engine=google_scholar&hl=en&num=20"
          },
          "related_pages_link": "https://scholar.google.com/scholar?q=related:_hGHdOmTof8J:scholar.google.com/&scioq=math&hl=en&num=20&as_sdt=0,10",
          "serpapi_related_pages_link": "https://serpapi.com/search.json?as_sdt=0%2C10&engine=google_scholar&hl=en&num=20&q=related%3A_hGHdOmTof8J%3Ascholar.google.com%2F",
          "versions": {
            "total": 2,
            "link": "https://scholar.google.com/scholar?cluster=18420166581813711358&hl=en&num=20&as_sdt=0,10",
            "cluster_id": "18420166581813711358",
            "serpapi_scholar_link": "https://serpapi.com/search.json?as_sdt=0%2C10&cluster=18420166581813711358&engine=google_scholar&hl=en&num=20"
          }
        }
      },
      {
        "position": 15,
        "title": "Approaching math increases math= me and math= pleasant",
        "result_id": "Fq7kRAUFa-8J",
        "link": "https://www.sciencedirect.com/science/article/pii/S0022103107001138",
        "snippet": "… math on implicit identification with math, implicit math attitudes, and behavior during a math test. The results from Study 1 demonstrated that women trained to approach math showed …",
        "publication_info": {
          "summary": "K Kawakami, JR Steele, C Cifa, CE Phills… - Journal of Experimental …, 2008 - Elsevier",
          "authors": [
            {
              "name": "JR Steele",
              "link": "https://scholar.google.com/citations?user=o8KO2EAAAAAJ&hl=en&num=20&oi=sra",
              "serpapi_scholar_link": "https://serpapi.com/search.json?author_id=o8KO2EAAAAAJ&engine=google_scholar_author&hl=en",
              "author_id": "o8KO2EAAAAAJ"
            },
            {
              "name": "CE Phills",
              "link": "https://scholar.google.com/citations?user=RewU7lQAAAAJ&hl=en&num=20&oi=sra",
              "serpapi_scholar_link": "https://serpapi.com/search.json?author_id=RewU7lQAAAAJ&engine=google_scholar_author&hl=en",
              "author_id": "RewU7lQAAAAJ"
            }
          ]
        },
        "resources": [
          {
            "title": "academia.edu",
            "file_format": "PDF",
            "link": "https://www.academia.edu/download/46588687/j.jesp.2007.07.00920160618-13418-6izfwg.pdf"
          }
        ],
        "inline_links": {
          "serpapi_cite_link": "https://serpapi.com/search.json?engine=google_scholar_cite&q=Fq7kRAUFa-8J",
          "cited_by": {
            "total": 132,
            "link": "https://scholar.google.com/scholar?cites=17251888317761629718&as_sdt=40005&sciodt=0,10&hl=en&num=20",
            "cites_id": "17251888317761629718",
            "serpapi_scholar_link": "https://serpapi.com/search.json?as_sdt=40005&cites=17251888317761629718&engine=google_scholar&hl=en&num=20"
          },
          "related_pages_link": "https://scholar.google.com/scholar?q=related:Fq7kRAUFa-8J:scholar.google.com/&scioq=math&hl=en&num=20&as_sdt=0,10",
          "serpapi_related_pages_link": "https://serpapi.com/search.json?as_sdt=0%2C10&engine=google_scholar&hl=en&num=20&q=related%3AFq7kRAUFa-8J%3Ascholar.google.com%2F",
          "versions": {
            "total": 11,
            "link": "https://scholar.google.com/scholar?cluster=17251888317761629718&hl=en&num=20&as_sdt=0,10",
            "cluster_id": "17251888317761629718",
            "serpapi_scholar_link": "https://serpapi.com/search.json?as_sdt=0%2C10&cluster=17251888317761629718&engine=google_scholar&hl=en&num=20"
          }
        }
      },
      {
        "position": 16,
        "title": "Insights from a math phobic",
        "result_id": "QRtFd2onozUJ",
        "link": "https://pubs.nctm.org/view/journals/mt/85/4/article-p296.xml",
        "snippet": "… what I discovered about learning and teaching mathematics … math phobia but may also be able to turn some phobics into fans. In my public-school days I didn't understand mathematics. …",
        "publication_info": {
          "summary": "AW Dodd - The mathematics teacher, 1992 - pubs.nctm.org"
        },
        "inline_links": {
          "serpapi_cite_link": "https://serpapi.com/search.json?engine=google_scholar_cite&q=QRtFd2onozUJ",
          "cited_by": {
            "total": 94,
            "link": "https://scholar.google.com/scholar?cites=3864976243435051841&as_sdt=40005&sciodt=0,10&hl=en&num=20",
            "cites_id": "3864976243435051841",
            "serpapi_scholar_link": "https://serpapi.com/search.json?as_sdt=40005&cites=3864976243435051841&engine=google_scholar&hl=en&num=20"
          },
          "related_pages_link": "https://scholar.google.com/scholar?q=related:QRtFd2onozUJ:scholar.google.com/&scioq=math&hl=en&num=20&as_sdt=0,10",
          "serpapi_related_pages_link": "https://serpapi.com/search.json?as_sdt=0%2C10&engine=google_scholar&hl=en&num=20&q=related%3AQRtFd2onozUJ%3Ascholar.google.com%2F",
          "versions": {
            "total": 5,
            "link": "https://scholar.google.com/scholar?cluster=3864976243435051841&hl=en&num=20&as_sdt=0,10",
            "cluster_id": "3864976243435051841",
            "serpapi_scholar_link": "https://serpapi.com/search.json?as_sdt=0%2C10&cluster=3864976243435051841&engine=google_scholar&hl=en&num=20"
          }
        }
      },
      {
        "position": 17,
        "title": "Writing in math",
        "result_id": "wnF_94DjYTAJ",
        "type": "Pdf",
        "link": "http://www.teachingandlearningnetwork.com/uploads/1/2/7/6/12764277/writing_for_math_ed_leadership_2004.pdf",
        "snippet": "… I chose mathematics for my undergraduate major was that it didn't require papers. Math homework called for solving problems or proving theorems, and that was just fine with me. Math …",
        "publication_info": {
          "summary": "M Burns - Educational Leadership, 2004 - teachingandlearningnetwork.com"
        },
        "resources": [
          {
            "title": "teachingandlearningnetwork.com",
            "file_format": "PDF",
            "link": "http://www.teachingandlearningnetwork.com/uploads/1/2/7/6/12764277/writing_for_math_ed_leadership_2004.pdf"
          }
        ],
        "inline_links": {
          "serpapi_cite_link": "https://serpapi.com/search.json?engine=google_scholar_cite&q=wnF_94DjYTAJ",
          "cited_by": {
            "total": 176,
            "link": "https://scholar.google.com/scholar?cites=3486317729609118146&as_sdt=40005&sciodt=0,10&hl=en&num=20",
            "cites_id": "3486317729609118146",
            "serpapi_scholar_link": "https://serpapi.com/search.json?as_sdt=40005&cites=3486317729609118146&engine=google_scholar&hl=en&num=20"
          },
          "related_pages_link": "https://scholar.google.com/scholar?q=related:wnF_94DjYTAJ:scholar.google.com/&scioq=math&hl=en&num=20&as_sdt=0,10",
          "serpapi_related_pages_link": "https://serpapi.com/search.json?as_sdt=0%2C10&engine=google_scholar&hl=en&num=20&q=related%3AwnF_94DjYTAJ%3Ascholar.google.com%2F",
          "versions": {
            "total": 5,
            "link": "https://scholar.google.com/scholar?cluster=3486317729609118146&hl=en&num=20&as_sdt=0,10",
            "cluster_id": "3486317729609118146",
            "serpapi_scholar_link": "https://serpapi.com/search.json?as_sdt=0%2C10&cluster=3486317729609118146&engine=google_scholar&hl=en&num=20"
          },
          "cached_page_link": "http://scholar.googleusercontent.com/scholar?q=cache:wnF_94DjYTAJ:scholar.google.com/+math&hl=en&num=20&as_sdt=0,10"
        }
      },
      {
        "position": 18,
        "title": "The open math standard",
        "result_id": "P23YRg5c558J",
        "type": "Pdf",
        "link": "https://citeseerx.ist.psu.edu/document?repid=rep1&type=pdf&doi=79d8ee61fe5746f5dd6609b14ff095199166dc5d",
        "snippet": "… of semantically rich mathematical objects. This draft of the … the representation and communication of mathematical objects. This … It is designed to allow the free exchange of …",
        "publication_info": {
          "summary": "S Buswell, O Caprotti, DP Carlisle, MC Dewar… - 2004 - Citeseer",
          "authors": [
            {
              "name": "O Caprotti",
              "link": "https://scholar.google.com/citations?user=tj3nHM0AAAAJ&hl=en&num=20&oi=sra",
              "serpapi_scholar_link": "https://serpapi.com/search.json?author_id=tj3nHM0AAAAJ&engine=google_scholar_author&hl=en",
              "author_id": "tj3nHM0AAAAJ"
            }
          ]
        },
        "resources": [
          {
            "title": "psu.edu",
            "file_format": "PDF",
            "link": "https://citeseerx.ist.psu.edu/document?repid=rep1&type=pdf&doi=79d8ee61fe5746f5dd6609b14ff095199166dc5d"
          }
        ],
        "inline_links": {
          "serpapi_cite_link": "https://serpapi.com/search.json?engine=google_scholar_cite&q=P23YRg5c558J",
          "cited_by": {
            "total": 189,
            "link": "https://scholar.google.com/scholar?cites=11522279388038589759&as_sdt=40005&sciodt=0,10&hl=en&num=20",
            "cites_id": "11522279388038589759",
            "serpapi_scholar_link": "https://serpapi.com/search.json?as_sdt=40005&cites=11522279388038589759&engine=google_scholar&hl=en&num=20"
          },
          "related_pages_link": "https://scholar.google.com/scholar?q=related:P23YRg5c558J:scholar.google.com/&scioq=math&hl=en&num=20&as_sdt=0,10",
          "serpapi_related_pages_link": "https://serpapi.com/search.json?as_sdt=0%2C10&engine=google_scholar&hl=en&num=20&q=related%3AP23YRg5c558J%3Ascholar.google.com%2F",
          "versions": {
            "total": 7,
            "link": "https://scholar.google.com/scholar?cluster=11522279388038589759&hl=en&num=20&as_sdt=0,10",
            "cluster_id": "11522279388038589759",
            "serpapi_scholar_link": "https://serpapi.com/search.json?as_sdt=0%2C10&cluster=11522279388038589759&engine=google_scholar&hl=en&num=20"
          },
          "cached_page_link": "https://scholar.googleusercontent.com/scholar?q=cache:P23YRg5c558J:scholar.google.com/+math&hl=en&num=20&as_sdt=0,10"
        }
      },
      {
        "position": 19,
        "title": "The influence of experiencing success in math on math anxiety, perceived math competence, and math performance",
        "result_id": "pHnuGG4Jnb4J",
        "link": "https://www.sciencedirect.com/science/article/pii/S1041608012001951",
        "snippet": "… the influence of success in math, independent of actual math ability, on math anxiety and perceived math competence. Relatively high success rates in math are ensured for all children …",
        "publication_info": {
          "summary": "BRJ Jansen, J Louwerse, M Straatemeier… - Learning and individual …, 2013 - Elsevier",
          "authors": [
            {
              "name": "BRJ Jansen",
              "link": "https://scholar.google.com/citations?user=SoURbp0AAAAJ&hl=en&num=20&oi=sra",
              "serpapi_scholar_link": "https://serpapi.com/search.json?author_id=SoURbp0AAAAJ&engine=google_scholar_author&hl=en",
              "author_id": "SoURbp0AAAAJ"
            }
          ]
        },
        "resources": [
          {
            "title": "psu.edu",
            "file_format": "PDF",
            "link": "https://citeseerx.ist.psu.edu/document?repid=rep1&type=pdf&doi=679593bb4dde7cb3636435485d76bc7f7b0470e0"
          }
        ],
        "inline_links": {
          "serpapi_cite_link": "https://serpapi.com/search.json?engine=google_scholar_cite&q=pHnuGG4Jnb4J",
          "cited_by": {
            "total": 248,
            "link": "https://scholar.google.com/scholar?cites=13735144807019215268&as_sdt=40005&sciodt=0,10&hl=en&num=20",
            "cites_id": "13735144807019215268",
            "serpapi_scholar_link": "https://serpapi.com/search.json?as_sdt=40005&cites=13735144807019215268&engine=google_scholar&hl=en&num=20"
          },
          "related_pages_link": "https://scholar.google.com/scholar?q=related:pHnuGG4Jnb4J:scholar.google.com/&scioq=math&hl=en&num=20&as_sdt=0,10",
          "serpapi_related_pages_link": "https://serpapi.com/search.json?as_sdt=0%2C10&engine=google_scholar&hl=en&num=20&q=related%3ApHnuGG4Jnb4J%3Ascholar.google.com%2F",
          "versions": {
            "total": 10,
            "link": "https://scholar.google.com/scholar?cluster=13735144807019215268&hl=en&num=20&as_sdt=0,10",
            "cluster_id": "13735144807019215268",
            "serpapi_scholar_link": "https://serpapi.com/search.json?as_sdt=0%2C10&cluster=13735144807019215268&engine=google_scholar&hl=en&num=20"
          }
        }
      }
    ],
    "related_searches": [
      {
        "query": "math elementary",
        "link": "https://scholar.google.com/scholar?hl=en&num=20&as_sdt=0,10&qsp=1&q=math+elementary&qst=ib"
      },
      {
        "query": "math instruction",
        "link": "https://scholar.google.com/scholar?hl=en&num=20&as_sdt=0,10&qsp=2&q=math+instruction&qst=ib"
      },
      {
        "query": "math grade",
        "link": "https://scholar.google.com/scholar?hl=en&num=20&as_sdt=0,10&qsp=3&q=math+grade&qst=ib"
      },
      {
        "query": "math achievement",
        "link": "https://scholar.google.com/scholar?hl=en&num=20&as_sdt=0,10&qsp=4&q=math+achievement&qst=ib"
      },
      {
        "query": "math middle school",
        "link": "https://scholar.google.com/scholar?hl=en&num=20&as_sdt=0,10&qsp=5&q=math+middle+school&qst=ib"
      },
      {
        "query": "math appl",
        "link": "https://scholar.google.com/scholar?hl=en&num=20&as_sdt=0,10&qsp=6&q=math+appl&qst=ib"
      },
      {
        "query": "math manipulatives",
        "link": "https://scholar.google.com/scholar?hl=en&num=20&as_sdt=0,10&qsp=7&q=math+manipulatives&qst=ib"
      },
      {
        "query": "math anxiety",
        "link": "https://scholar.google.com/scholar?hl=en&num=20&as_sdt=0,10&qsp=8&q=math+anxiety&qst=ib"
      }
    ],
    "pagination": {
      "current": 1,
      "next": "https://scholar.google.com/scholar?start=20&q=math&hl=en&num=20&as_sdt=0,10",
      "other_pages": {
        "2": "https://scholar.google.com/scholar?start=20&q=math&hl=en&num=20&as_sdt=0,10",
        "3": "https://scholar.google.com/scholar?start=40&q=math&hl=en&num=20&as_sdt=0,10",
        "4": "https://scholar.google.com/scholar?start=60&q=math&hl=en&num=20&as_sdt=0,10",
        "5": "https://scholar.google.com/scholar?start=80&q=math&hl=en&num=20&as_sdt=0,10",
        "6": "https://scholar.google.com/scholar?start=100&q=math&hl=en&num=20&as_sdt=0,10",
        "7": "https://scholar.google.com/scholar?start=120&q=math&hl=en&num=20&as_sdt=0,10",
        "8": "https://scholar.google.com/scholar?start=140&q=math&hl=en&num=20&as_sdt=0,10",
        "9": "https://scholar.google.com/scholar?start=160&q=math&hl=en&num=20&as_sdt=0,10",
        "10": "https://scholar.google.com/scholar?start=180&q=math&hl=en&num=20&as_sdt=0,10"
      }
    },
    "serpapi_pagination": {
      "current": 1,
      "next_link": "https://serpapi.com/search.json?as_sdt=0%2C10&engine=google_scholar&hl=en&num=20&q=math&start=20",
      "next": "https://serpapi.com/search.json?as_sdt=0%2C10&engine=google_scholar&hl=en&num=20&q=math&start=20",
      "other_pages": {
        "2": "https://serpapi.com/search.json?as_sdt=0%2C10&engine=google_scholar&hl=en&num=20&q=math&start=20",
        "3": "https://serpapi.com/search.json?as_sdt=0%2C10&engine=google_scholar&hl=en&num=20&q=math&start=40",
        "4": "https://serpapi.com/search.json?as_sdt=0%2C10&engine=google_scholar&hl=en&num=20&q=math&start=60",
        "5": "https://serpapi.com/search.json?as_sdt=0%2C10&engine=google_scholar&hl=en&num=20&q=math&start=80",
        "6": "https://serpapi.com/search.json?as_sdt=0%2C10&engine=google_scholar&hl=en&num=20&q=math&start=100",
        "7": "https://serpapi.com/search.json?as_sdt=0%2C10&engine=google_scholar&hl=en&num=20&q=math&start=120",
        "8": "https://serpapi.com/search.json?as_sdt=0%2C10&engine=google_scholar&hl=en&num=20&q=math&start=140",
        "9": "https://serpapi.com/search.json?as_sdt=0%2C10&engine=google_scholar&hl=en&num=20&q=math&start=160",
        "10": "https://serpapi.com/search.json?as_sdt=0%2C10&engine=google_scholar&hl=en&num=20&q=math&start=180"
      }
    }
  }
}