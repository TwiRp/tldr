$(document).ready(function () {
    const popular_query = `
    {
        storiesFeed(type: FEATURED, page: DAPAGE) {
            author {
            publicationDomain
            }
            slug
        }
    }`;

    const post_query = `{
        post(slug: "DASLUG", hostname: "DADOMAIN") {
          _id
          slug
          title
          publication {
            domain
          }
          contentMarkdown
          author {
            username
            name
          }
        }
      }`;

    async function get_post(slug, domain) {
        var p_query = post_query.replace("DASLUG", slug).replace("DADOMAIN", domain);
        const response = await fetch("https://api.hashnode.com", {
            method: "post",
            headers: {
            "Content-Type": "application/json"
            },
            body: JSON.stringify({ query: p_query })
        });
        const body = await response.json();
        const post = body.data.post;
        const text = post.contentMarkdown;
        const sentences = 3;
        console.log(post.title);
        $.ajax({
            url: "/api/summarize",
            type: "POST",
            data: JSON.stringify({
                text: text,
                sentences: sentences
            }),
            contentType: "application/json",
            dataType: "json",
            success: function (data, status, xhr) {
                $("#the-content").append(
                    $('<div/>')
                        .addClass("card box-shadow blog-entry")
                        .append(
                            $('<div/>').addClass("card-body")
                                .attr("id", post.slug)
                                .append(
                                    $('<h3/>').addClass("text-primary")
                                        .append (
                                            $('<a/>').attr("href", "https://" + domain + "/" + post.slug)
                                                .addClass("text-dark")
                                                .text(post.title)
                                        )
                                )
                        )
                );
                $("#" + post.slug).append(
                    $('<div/>').addClass("text-muted")
                        .text(post.author.name + " @ " + domain)
                );
                $("#" + post.slug).append(
                    $('<p/>').text(data.summary)
                );
            }
        })
        
    }

    async function get_popular_posts(page) {
        const da_query = popular_query.replace("DAPAGE", page);
        const response = await fetch("https://api.hashnode.com", {
            method: "post",
            headers: {
            "Content-Type": "application/json"
            },
            body: JSON.stringify({ query: da_query })
        });
        const body = await response.json();
        body.data.storiesFeed.forEach((post) => {
            if (post.slug && post.author.publicationDomain) {
                console.log("Loading: " + post.slug + " from " + post.author.publicationDomain);
                get_post(post.slug, post.author.publicationDomain);
            }
        });
    }

    for(var page = 0; page < 3; page += 1) {
        get_popular_posts(page);
    }
});